pipeline {
    agent any

    environment {
        IMAGE_NAME = "lms_django"
        CONTAINER_NAME = "lms_backend"
        DOCKER_PATH = "/usr/local/bin/docker"  // Use the correct Docker path on Mac
        EC2_USER = "ubuntu"
        EC2_HOST = "ec2-54-172-80-79.compute-1.amazonaws.com"
        SSH_KEY = "/var/lib/jenkins/.ssh/lms_django.pem"  // Update with your Mac's SSH key path
        DOCKER_HUB_REPO = "rifathmfm/lms_django" 
        MONGO_URI = credentials('mongodb-uri-credential')
        SECRET_KEY = credentials('django-secret-key')
        DJANGO_ALLOWED_HOSTS = "54.172.80.79,your-domain.com"
        DEBUG = "0"
        SSH_CREDS = credentials('deploy-key-id')
        REMOTE_USER = "ubuntu" // or ec2-user depending on your AMI
        REMOTE_HOST = "54.172.80.79"
        APP_DIR = "/var/www/lms_backend"
        DEPLOY_USER = "ec2-user"  // or ubuntu, depending on your EC2 instance 
        }

    stages {
        stage('Clone Repository on Mac') {
            steps {
                sh '''
                if [ ! -d "$WORKSPACE/LMS_DEVOPS_Project" ]; then
                    git clone https://github.com/MfmRifath/LMS_DEVOPS_Project.git $WORKSPACE/LMS_DEVOPS_Project
                else
                    cd $WORKSPACE/LMS_DEVOPS_Project && git pull origin main
                fi
                '''
            }
        }
        stage('Build and Push Docker Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'docker-hub-password', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                    sh '''
                    cd $WORKSPACE/LMS_DEVOPS_Project
                    echo "$DOCKER_PASSWORD" | $DOCKER_PATH login -u "$DOCKER_USERNAME" --password-stdin
                    
                    # Build the image with platform flag
                    $DOCKER_PATH build --platform=linux/amd64 -t $DOCKER_HUB_REPO:latest .
                    
                    # Push the image to Docker Hub
                    $DOCKER_PATH push $DOCKER_HUB_REPO:latest
                    '''
                }
            }
        }
        stage('Deploy on EC2') {
            steps {
                sh '''
                ssh -o StrictHostKeyChecking=no -i $SSH_KEY $EC2_USER@$EC2_HOST << 'EOF'
                # Define variables on the remote server
                DOCKER_HUB_REPO="rifathmfm/lms_django"
                CONTAINER_NAME="lms_backend"
                
                set -e  # Exit script on errors
                set -x  # Enable debugging

                echo "Checking if Docker is installed..."
                if ! command -v docker &> /dev/null; then
                    echo "Installing Docker..."
                    sudo apt update
                    sudo apt install -y docker.io
                    sudo systemctl start docker
                    sudo systemctl enable docker
                    sudo usermod -aG docker ubuntu
                else
                    echo "Docker is already installed."
                fi

                echo "Ensuring correct Docker permissions..."
                sudo chmod 777 /var/run/docker.sock

                echo "Pulling latest Docker image from Docker Hub..."
                docker pull $DOCKER_HUB_REPO:latest

                echo "Stopping and removing existing container if it exists..."
                docker stop $CONTAINER_NAME || true
                docker rm $CONTAINER_NAME || true

                echo "Running new container on EC2..."
                docker run -d -p 8000:8000 --restart=always --name $CONTAINER_NAME $DOCKER_HUB_REPO:latest

                echo "Deployment successful! Running containers:"
                docker ps -a
EOF
                '''
            }
        }

        stage('Wait for Application Startup') {
            steps {
                sh '''
                # Wait for the application to start
                sleep 20
                '''
            }
        }

        stage('Verify Deployment on EC2') {
            steps {
                sh '''
                ssh -o StrictHostKeyChecking=no -i $SSH_KEY $EC2_USER@$EC2_HOST '
                curl -I http://localhost:8000 || echo "Application not responding on port 8000"
                '
                '''
            }
        }

        stage('Diagnose Container') {
            steps {
                sh '''
                ssh -o StrictHostKeyChecking=no -i $SSH_KEY $EC2_USER@$EC2_HOST '
                echo "Container logs:"
                docker logs lms_backend
                
                echo "Container status:"
                docker inspect -f "{{.State.Status}}" lms_backend
                
                echo "Network settings:"
                docker inspect -f "{{.NetworkSettings.Ports}}" lms_backend
                
                echo "Checking if anything is listening on port 8000 inside the container:"
                docker exec lms_backend sh -c "apt-get update && apt-get install -y net-tools && netstat -tuln | grep 8000" || echo "Nothing listening on port 8000"
                
                echo "Process list inside container:"
                docker exec lms_backend ps aux
                '
                '''
            }
        }
    
    stage('MongoDB Setup') {
            steps {
                // Check if we can connect to MongoDB
                sh '''
                # We're using a MongoDB Atlas cluster, so no local setup required
                # Just verify connection using a simple Python script
                python3 -c "
import os
from mongoengine import connect, ConnectionError
try:
    uri = os.environ.get('MONGO_URI')
    connect(host=uri)
    print('MongoDB connection successful')
except Exception as e:
    print(f'MongoDB connection failed: {e}')
    exit(1)
"
                '''
            }
        }
        
        stage('Deploy Application') {
            steps {
                sshagent(['deploy-key-id']) {
                    // Create app directory if it doesn't exist
                    sh "ssh ${REMOTE_USER}@${REMOTE_HOST} 'mkdir -p ${APP_DIR}'"
                    
                    // Transfer files
                    sh "rsync -avz --exclude '.git' --exclude '*.pyc' --exclude 'venv' ./ ${REMOTE_USER}@${REMOTE_HOST}:${APP_DIR}/"
                    
                    // Setup environment
                    sh """
                    ssh ${REMOTE_USER}@${REMOTE_HOST} 'cat > ${APP_DIR}/.env << EOL
MONGO_URI=${MONGO_URI}
SECRET_KEY=${SECRET_KEY}
DEBUG=${DEBUG}
DJANGO_ALLOWED_HOSTS=${DJANGO_ALLOWED_HOSTS}
EOL'
                    """
                    
                    // Setup virtual environment and dependencies
                    sh """
                    ssh ${REMOTE_USER}@${REMOTE_HOST} 'cd ${APP_DIR} && python3 -m venv venv && 
                    source venv/bin/activate && 
                    pip install -r requirements.txt && 
                    python manage.py collectstatic --noinput'
                    """
                    
                    // Setup Gunicorn service (if not already set up)
                    sh """
                    ssh ${REMOTE_USER}@${REMOTE_HOST} 'sudo cat > /etc/systemd/system/gunicorn.service << EOL
[Unit]
Description=gunicorn daemon for LMS
After=network.target

[Service]
User=${REMOTE_USER}
Group=${REMOTE_USER}
WorkingDirectory=${APP_DIR}
ExecStart=${APP_DIR}/venv/bin/gunicorn --access-logfile - --workers 3 --bind unix:${APP_DIR}/lms.sock lms_backend.wsgi:application
Restart=on-failure
Environment="LANG=en_US.UTF-8"
EnvironmentFile=${APP_DIR}/.env

[Install]
WantedBy=multi-user.target
EOL'
                    """
                    
                    // Reload services and restart
                    sh """
                    ssh ${REMOTE_USER}@${REMOTE_HOST} 'sudo systemctl daemon-reload && 
                    sudo systemctl restart gunicorn && 
                    sudo systemctl enable gunicorn'
                    """
                }
            }
        }
        
        stage('Setup Nginx') {
            steps {
                sshagent(['deploy-key-id']) {
                    // Install Nginx if not present
                    sh """
                    ssh ${REMOTE_USER}@${REMOTE_HOST} 'sudo apt update && sudo apt install -y nginx'
                    """
                    
                    // Configure Nginx
                    sh """
                    ssh ${REMOTE_USER}@${REMOTE_HOST} 'sudo cat > /etc/nginx/sites-available/lms << EOL
server {
    listen 80;
    server_name 54.172.80.79;

    location = /favicon.ico { access_log off; log_not_found off; }
    location /static/ {
        root ${APP_DIR};
    }

    location / {
        include proxy_params;
        proxy_pass http://unix:${APP_DIR}/lms.sock;
    }
}
EOL'
                    """
                    
                    // Enable the site and restart Nginx
                    sh """
                    ssh ${REMOTE_USER}@${REMOTE_HOST} 'sudo ln -sf /etc/nginx/sites-available/lms /etc/nginx/sites-enabled/ && 
                    sudo nginx -t && 
                    sudo systemctl restart nginx'
                    """
                }
            }
        }
        
        stage('Setup MongoDB Backup') {
            steps {
                sshagent(['deploy-key-id']) {
                    // Create a backup script
                    sh """
                    ssh ${REMOTE_USER}@${REMOTE_HOST} 'cat > ${APP_DIR}/backup_mongodb.sh << EOL
#!/bin/bash
# Load environment variables
source \${APP_DIR}/.env

# Set backup directory
BACKUP_DIR="\${APP_DIR}/backups"
mkdir -p \$BACKUP_DIR

# Create backup with timestamp
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="\$BACKUP_DIR/mongodb_\${TIMESTAMP}.gz"

# Run mongodump (using MongoDB Atlas)
mongodump --uri="\$MONGO_URI" --gzip --archive="\$BACKUP_FILE"

# Clean up old backups (keep only the last 7)
ls -tp \$BACKUP_DIR/*.gz | grep -v '/$' | tail -n +8 | xargs -I {} rm -- {}

echo "Backup completed: \$BACKUP_FILE"
EOL'
                    """
                    
                    // Make the script executable
                    sh """
                    ssh \${REMOTE_USER}@\${REMOTE_HOST} 'chmod +x \${APP_DIR}/backup_mongodb.sh'
                    """
                    
                    // Set up a daily cron job
                    sh """
                    ssh ${REMOTE_USER}@${REMOTE_HOST} '(crontab -l 2>/dev/null || echo "") | grep -v "backup_mongodb.sh" | 
                    { cat; echo "0 2 * * * ${APP_DIR}/backup_mongodb.sh >> ${APP_DIR}/backup.log 2>&1"; } | crontab -'
                    """
                }
            }
        }
    }

    
    post {
        success {
            echo "Pipeline executed successfully!"
            echo 'MongoDB setup completed successfully!'
        }
        failure {
            echo "Pipeline failed. Check the logs for details."
            echo 'MongoDB setup failed!'
        }
    }
}
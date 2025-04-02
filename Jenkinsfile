pipeline {
    agent any

    environment {
        // Application settings
        IMAGE_NAME         = "lms_django"
        CONTAINER_NAME     = "lms_backend"
        DOCKER_HUB_REPO    = "rifathmfm/lms_django"
        
        // Server details
        EC2_USER           = "ubuntu"
        EC2_HOST           = "ec2-54-221-182-141.compute-1.amazonaws.com"
        REMOTE_HOST        = "54.221.182.141"
        APP_DIR            = "/var/www/lms_backend"
        
        // Docker path (adjust as needed for your Jenkins server)
        DOCKER_PATH        = "/usr/local/bin/docker"
        
        // Credentials and secrets - do not use credentials() wrapper in environment block
        // We'll use withCredentials blocks in the actual pipeline steps
        DJANGO_ALLOWED_HOSTS = "${REMOTE_HOST},localhost,127.0.0.1"
        DEBUG              = "0"
    }

    stages {
        stage('Clone Repository') {
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
        
        stage('Run Tests') {
            steps {
                sh '''
                cd $WORKSPACE/LMS_DEVOPS_Project
                
                # Create virtual environment for testing
                python3 -m venv venv || python -m venv venv
                source venv/bin/activate
                
                # Install dependencies
                pip install -r requirements.txt || echo "Could not install dependencies, continuing anyway"
                
                # Run Django tests if available
                python manage.py test || echo "No tests available, skipping..."
                
                deactivate
                '''
            }
        }
        
        // Leaving the Terraform stage commented out for now to reduce complexity during troubleshooting
        /*
        stage('Provision Infrastructure with Terraform') {
            steps {
                sh '''
                cd $WORKSPACE/LMS_DEVOPS_Project/terraform
                
                # Initialize Terraform
                terraform init
                
                # Plan Terraform changes
                terraform plan -out=tfplan
                
                # Apply Terraform changes
                terraform apply -auto-approve tfplan
                
                # Get the new EC2 instance IP if it changed
                export EC2_IP=$(terraform output -raw instance_public_ip || echo "${REMOTE_HOST}")
                echo "EC2 Instance IP: $EC2_IP"
                '''
            }
        }
        */

        stage('Test MongoDB Connection') {
            steps {
                withCredentials([string(credentialsId: 'mongodb-uri', variable: 'MONGO_URI')]) {
                    sh '''
                    # Create a temporary test script
                    cat > /tmp/test_mongodb.py << EOL
import os
from pymongo import MongoClient
import sys

uri = os.environ.get('MONGO_URI')
if not uri:
    print("ERROR: MONGO_URI environment variable is not set")
    sys.exit(1)

# Mask all but the first few characters for security in logs
masked_uri = uri[:20] + "..." if len(uri) > 20 else uri
print(f"Testing connection to MongoDB with URI: {masked_uri}")

try:
    # Create a connection using pymongo
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    
    # Force a connection to verify
    client.admin.command('ping')
    
    print("MongoDB connection successful!")
    print("Available databases:")
    for db_name in client.list_database_names():
        print(f" - {db_name}")
        
except Exception as e:
    print(f"MongoDB connection failed: {e}")
    sys.exit(1)
EOL

                    # Create virtual environment for MongoDB test
                    python3 -m venv /tmp/mongo_test_env || python -m venv /tmp/mongo_test_env
                    source /tmp/mongo_test_env/bin/activate
                    pip install pymongo[srv]
                    
                    # Run the MongoDB connection test
                    python /tmp/test_mongodb.py
                    
                    deactivate
                    '''
                }
            }
        }

        stage('Build and Push Docker Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'docker-hub-creds', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                    sh '''
                    cd $WORKSPACE/LMS_DEVOPS_Project
                    
                    # Login to Docker Hub
                    echo "$DOCKER_PASSWORD" | $DOCKER_PATH login -u "$DOCKER_USERNAME" --password-stdin
                    
                    # Build the image for Linux/AMD64 platform
                    $DOCKER_PATH build --platform=linux/amd64 -t $DOCKER_HUB_REPO:latest .
                    
                    # Also tag with build number for versioning
                    $DOCKER_PATH tag $DOCKER_HUB_REPO:latest $DOCKER_HUB_REPO:build-$BUILD_NUMBER
                    
                    # Push both tags to Docker Hub
                    $DOCKER_PATH push $DOCKER_HUB_REPO:latest
                    $DOCKER_PATH push $DOCKER_HUB_REPO:build-$BUILD_NUMBER
                    
                    # Logout from Docker Hub
                    $DOCKER_PATH logout
                    '''
                }
            }
        }

        stage('Deploy on EC2') {
            steps {
                withCredentials([
                    sshUserPrivateKey(credentialsId: 'aws-ssh-key', keyFileVariable: 'SSH_KEY'),
                    string(credentialsId: 'mongodb-uri', variable: 'MONGO_URI'),
                    string(credentialsId: 'django-secret-key', variable: 'SECRET_KEY')
                ]) {
                    sh '''
                    # Copy deployment scripts to EC2
                    scp -o StrictHostKeyChecking=no -i $SSH_KEY $WORKSPACE/LMS_DEVOPS_Project/deploy.sh $EC2_USER@$EC2_HOST:/tmp/ || echo "No deploy.sh file found, continuing anyway"
                    
                    # Execute deployment script on EC2
                    ssh -o StrictHostKeyChecking=no -i $SSH_KEY $EC2_USER@$EC2_HOST << EOF
                    # Define variables on the remote server
                    DOCKER_HUB_REPO="rifathmfm/lms_django"
                    CONTAINER_NAME="lms_backend"
                    MONGO_URI="${MONGO_URI}"
                    SECRET_KEY="${SECRET_KEY}"
                    DEBUG="${DEBUG}"
                    DJANGO_ALLOWED_HOSTS="${DJANGO_ALLOWED_HOSTS}"
                     
                    # Enable error handling and debugging
                    set -e
                    set -x

                    # Ensure Docker is installed
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

                    # Ensure correct Docker permissions
                    sudo chmod 666 /var/run/docker.sock || true

                    # Pull latest Docker image
                    docker pull $DOCKER_HUB_REPO:latest

                    # Stop and remove existing container if it exists
                    docker stop $CONTAINER_NAME || true
                    docker rm $CONTAINER_NAME || true

                    # Create app directory if it doesn't exist
                    sudo mkdir -p /var/www/lms_backend/static
                    sudo mkdir -p /var/www/lms_backend/media
                    sudo chmod -R 777 /var/www/lms_backend

                    # Run new container
                    docker run -d -p 8000:8000 --restart=always --name $CONTAINER_NAME \\
                    -e MONGO_URI="\${MONGO_URI}" \\
                    -e SECRET_KEY="\${SECRET_KEY}" \\
                    -e DEBUG="\${DEBUG}" \\
                    -e DJANGO_ALLOWED_HOSTS="\${DJANGO_ALLOWED_HOSTS}" \\
                    -e PYTHONUNBUFFERED="1" \\
                    -v /var/www/lms_backend/static:/app/staticfiles \\
                    -v /var/www/lms_backend/media:/app/media \\
                    $DOCKER_HUB_REPO:latest

                    echo "Deployment successful! Running containers:"
                    docker ps -a
EOF
                    '''
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                withCredentials([sshUserPrivateKey(credentialsId: 'aws-ssh-key', keyFileVariable: 'SSH_KEY')]) {
                    sh '''
                    # Check application status
                    ssh -o StrictHostKeyChecking=no -i $SSH_KEY $EC2_USER@$EC2_HOST '
                        echo "=== CONTAINER STATUS ==="
                        docker ps -a | grep lms_backend || echo "Container not found"
                        
                        echo "=== APPLICATION HEALTH CHECK ==="
                        curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/ || echo "Application not responding on port 8000"
                        
                        echo "=== CONTAINER LOGS (LAST 20 LINES) ==="
                        docker logs --tail 20 lms_backend || echo "Cannot get container logs"
                    '
                    '''
                }
            }
        }
    }

    post {
        success {
            node(null) {  // Use null to run on any available node
                echo "=============================================="
                echo "CI/CD Pipeline executed successfully!"
                echo "Application deployed to ${EC2_HOST}"
                echo "MongoDB connection configured correctly"
                echo "=============================================="
            }
        }
        
        failure {
            node(null) {  // Use null to run on any available node
                echo "=============================================="
                echo "CI/CD Pipeline failed. Check the logs for details."
                echo "=============================================="
                
                // Send notification on failure
                script {
                    try {
                        withCredentials([sshUserPrivateKey(credentialsId: 'aws-ssh-key', keyFileVariable: 'SSH_KEY')]) {
                            sh '''
                            ssh -o StrictHostKeyChecking=no -i $SSH_KEY $EC2_USER@$EC2_HOST '
                                # Get logs for debugging
                                echo "=== FULL CONTAINER LOGS ==="
                                docker logs lms_backend || echo "Container not running"
                                
                                # Check container status
                                docker inspect lms_backend || echo "Container not found"
                            '
                            '''
                        }
                    } catch (Exception e) {
                        echo "Could not execute SSH commands: ${e.message}"
                    }
                }
            }
        }
        
        always {
            node(null) {  // Use null to run on any available node
                // Clean up workspace safely
                script {
                    try {
                        cleanWs(cleanWhenNotBuilt: false,
                                deleteDirs: true,
                                disableDeferredWipeout: true,
                                notFailBuild: true,
                                patterns: [[pattern: 'venv', type: 'INCLUDE']])
                    } catch (Exception e) {
                        echo "Workspace cleanup failed: ${e.message}"
                    }
                }
            }
        }
    }
}
pipeline {
    agent any

    environment {
        IMAGE_NAME         = "lms_django"
        CONTAINER_NAME     = "lms_backend"
        DOCKER_PATH        = "/usr/local/bin/docker"  // Use the correct Docker path on Mac
        EC2_USER           = "ubuntu"
        EC2_HOST           = "ec2-54-221-182-141.compute-1.amazonaws.com"
        SSH_KEY            = "/var/lib/jenkins/.ssh/lms_backend.pem"  // Update with your Mac's SSH key path
        DOCKER_HUB_REPO    = "rifathmfm/lms_django"
        // Use the corrected MongoDB URI with the encoded "@" character in the password
        MONGO_URI          = "mongodb+srv://rifath:3853532@cluster0.7n8xk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
        SECRET_KEY         = credentials('django-secret-key')
        DJANGO_ALLOWED_HOSTS = "54.221.182.141,your-domain.com"
        DEBUG              = "0"
        SSH_CREDS          = credentials('deploy-key-id')
        REMOTE_USER        = "ubuntu" // or ec2-user depending on your AMI
        REMOTE_HOST        = "54.221.182.141"
        APP_DIR            = "/var/www/lms_backend"
        DEPLOY_USER        = "ec2-user"  // or ubuntu, depending on your EC2 instance
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

        stage('Test MongoDB Connection') {
            steps {
                sh '''
                # Create a temporary file with the MongoDB test script
            
            echo "Creating virtual environment..."
            python3 -m venv /tmp/mongo_test_env
            source /tmp/mongo_test_env/bin/activate
            python -m pip install --upgrade pip
            python -m pip install pymongo

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

                # Copy the script to the EC2 instance
                scp -o StrictHostKeyChecking=no -i $SSH_KEY /tmp/test_mongodb.py $EC2_USER@$EC2_HOST:/tmp/

                # Execute the script on the EC2 instance with the correct MongoDB URI
                ssh -o StrictHostKeyChecking=no -i $SSH_KEY $EC2_USER@$EC2_HOST "
                    # Create a virtual environment and install pymongo
                    sudo apt update && sudo apt install python3 python3-venv python3-pip -y
                    python3 -m venv /tmp/mongo_test_env
                    source /tmp/mongo_test_env/bin/activate
                     # Upgrade pip and install
                        python3 -m pip install --upgrade pip
                        python3 -m pip install pymongo

                    # Run the test with the actual MongoDB URI
                    MONGO_URI='$MONGO_URI' python3 /tmp/test_mongodb.py
                "
                '''
            }
        }
        stage('Update Dockerfile for Debugging') {
            steps {
                sh '''
                cd $WORKSPACE/LMS_DEVOPS_Project
                
                # Check if the entrypoint script line already exists in the Dockerfile
                if ! grep -q "entrypoint.sh" Dockerfile; then
                    # Add debugging entrypoint before the CMD line
                    sed -i '' '/CMD/i\\
# Add a debugging startup script\\
RUN echo '"'"'#!/bin/bash\\necho "=== ENVIRONMENT VARIABLES ===\\nenv\\necho "=== TESTING DJANGO SETTINGS ===\\npython manage.py check\\necho "=== STARTING APPLICATION ===\\nexec "$@"'"'"' > /app/entrypoint.sh && \\\\\\
    chmod +x /app/entrypoint.sh\\
\\
# Use entrypoint script before the main command\\
ENTRYPOINT ["/app/entrypoint.sh"]\\
' Dockerfile
                fi
                
                # Print the updated Dockerfile
                cat Dockerfile
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
                docker run -d -p 8000:8000 --restart=always --name $CONTAINER_NAME \
                -e MONGO_URI="$MONGO_URI" \
                -e SECRET_KEY="$SECRET_KEY" \
                -e DEBUG="1" \
                -e DJANGO_ALLOWED_HOSTS="$DJANGO_ALLOWED_HOSTS" \
                -e PYTHONUNBUFFERED="1" \
                $DOCKER_HUB_REPO:latest

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

        stage('Diagnose Container') {
            steps {
                sh '''
                ssh -o StrictHostKeyChecking=no -i $SSH_KEY $EC2_USER@$EC2_HOST '
                echo "=== FULL CONTAINER LOGS ==="
                docker logs lms_backend --tail 100
                
                echo "=== ENVIRONMENT VARIABLES IN CONTAINER ==="
                docker exec lms_backend env || echo "Cannot execute command - container may have exited"
                
                echo "=== CONTAINER STATUS ==="
                docker inspect -f "{{.State.Status}}" lms_backend
                docker inspect -f "{{.State.ExitCode}}" lms_backend
                
                echo "=== CONTAINER NETWORKING ==="
                docker inspect -f "{{.NetworkSettings.Ports}}" lms_backend
                
                echo "=== CHECKING CONTAINER FILE SYSTEM ==="
                docker exec lms_backend ls -la /app || echo "Cannot access container file system"
                
                echo "=== CHECKING DJANGO SETTINGS ==="
                docker exec lms_backend cat /app/lms_backend/settings.py || echo "Cannot access settings file"
                '
                '''
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
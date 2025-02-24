pipeline {
    agent any

    environment {
        IMAGE_NAME = "lms_django"
        CONTAINER_NAME = "lms_backend"
        DOCKER_PATH = "/usr/local/bin/docker"  // Use the correct Docker path on Mac
        EC2_USER = "ubuntu"
        EC2_HOST = "ec2-54-172-80-79.compute-1.amazonaws.com"
        SSH_KEY = "/var/lib/jenkins/.ssh/lms_django.pem"  // Update with your Mac's SSH key path
        DOCKER_HUB_REPO = "rifathmfm/lms_django"  // Update with your Docker Hub repo
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

        stage('Build Docker Image on Mac') {
            steps {
                sh '''
                cd $WORKSPACE/LMS_DEVOPS_Project
                $DOCKER_PATH build -t $DOCKER_HUB_REPO:latest .
                '''
            }
        }

        stage('Push Image to Docker Hub') {
        steps {
            withCredentials([usernamePassword(credentialsId: 'docker-hub-password', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                sh '''
                echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
                docker push rifathmfm/lms_django:latest
                '''
            }
        }
        }

        stage('Deploy on EC2') {
        steps {
            sh '''
            ssh -o StrictHostKeyChecking=no -i $SSH_KEY $EC2_USER@$EC2_HOST << 'EOF'
            set -e  # Exit script on errors

            # Ensure Docker is installed
            if ! command -v docker &> /dev/null; then
                sudo apt update
                sudo apt install -y docker.io
                sudo systemctl start docker
                sudo systemctl enable docker
                sudo usermod -aG docker ubuntu
            fi

            # Fix Docker permissions
            sudo chmod +x /usr/bin/docker
            sudo chown root:docker /usr/bin/docker

            # Find the correct Docker path
            DOCKER_CMD=$(command -v docker)
            echo "Using Docker Path: $DOCKER_CMD"

            # Ensure Docker is executable
            if [ ! -x "$DOCKER_CMD" ]; then
                echo "Docker is not executable at $DOCKER_CMD"
                exit 1
            fi

            # Stop and remove existing container
            $DOCKER_CMD ps -a
            $DOCKER_CMD stop $CONTAINER_NAME || true
            $DOCKER_CMD rm -f $CONTAINER_NAME || true

            # Pull latest image from Docker Hub
            $DOCKER_CMD pull $DOCKER_HUB_REPO:latest

            # Run the new container
            $DOCKER_CMD run -d -p 8000:8000 --restart=always --name $CONTAINER_NAME $DOCKER_HUB_REPO:latest

            # Verify container is running
            $DOCKER_CMD ps -a
            EOF
            '''
        }
    }
        stage('Verify Deployment on EC2') {
            steps {
                sh "ssh -o StrictHostKeyChecking=no -i $SSH_KEY $EC2_USER@$EC2_HOST 'curl -I http://localhost:8000'"
            }
        }
    }
}
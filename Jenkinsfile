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
        stage('Verify Deployment on EC2') {
            steps {
                sh "ssh -o StrictHostKeyChecking=no -i $SSH_KEY $EC2_USER@$EC2_HOST 'curl -I http://localhost:8000'"
            }
        }
    }
}
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
                withCredentials([string(credentialsId: 'docker-hub-password', variable: 'DOCKER_PASSWORD')]) {
                    sh '''
                    echo "$DOCKER_PASSWORD" | $DOCKER_PATH login -u yourdockerhubusername --password-stdin
                    $DOCKER_PATH push $DOCKER_HUB_REPO:latest
                    '''
                }
            }
        }

        stage('Deploy on EC2') {
            steps {
                sh '''
                ssh -o StrictHostKeyChecking=no -i $SSH_KEY $EC2_USER@$EC2_HOST << EOF
                $DOCKER_PATH stop $CONTAINER_NAME || true
                $DOCKER_PATH rm $CONTAINER_NAME || true
                $DOCKER_PATH pull $DOCKER_HUB_REPO:latest
                $DOCKER_PATH run -d -p 8000:8000 --name $CONTAINER_NAME --restart=always $DOCKER_HUB_REPO:latest
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
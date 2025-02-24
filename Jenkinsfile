pipeline {
    agent any

    environment {
        IMAGE_NAME = "lms_django"
        CONTAINER_NAME = "lms_backend"
        DOCKER_PATH = "/usr/local/bin/docker" // Correct Docker path for EC2
        EC2_USER = "ubuntu"
        EC2_HOST = "ec2-54-172-80-79.compute-1.amazonaws.com"
        SSH_KEY = "/var/lib/jenkins/.ssh/lms_django.pem"
    }

    stages {
        stage('Clone Repository') {
            steps {
                git branch: 'main', url: 'https://github.com/MfmRifath/LMS_DEVOPS_Project.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "ssh -o StrictHostKeyChecking=no -i $SSH_KEY $EC2_USER@$EC2_HOST 'cd /home/ubuntu/LMS_DEVOPS_Project && $DOCKER_PATH build -t $IMAGE_NAME .'"
            }
        }

        stage('Stop and Remove Old Container') {
            steps {
                script {
                    sh "ssh -o StrictHostKeyChecking=no -i $SSH_KEY $EC2_USER@$EC2_HOST '$DOCKER_PATH stop $CONTAINER_NAME || true'"
                    sh "ssh -o StrictHostKeyChecking=no -i $SSH_KEY $EC2_USER@$EC2_HOST '$DOCKER_PATH rm $CONTAINER_NAME || true'"
                }
            }
        }

        stage('Run New Container') {
            steps {
                sh "ssh -o StrictHostKeyChecking=no -i $SSH_KEY $EC2_USER@$EC2_HOST '$DOCKER_PATH run -d -p 8000:8000 --name $CONTAINER_NAME $IMAGE_NAME'"
            }
        }
    }
}
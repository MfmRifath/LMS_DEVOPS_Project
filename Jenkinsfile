pipeline {
    agent any

    environment {
        IMAGE_NAME = "lms_django"
        CONTAINER_NAME = "lms_backend"
        DOCKER_PATH = "/usr/bin/docker"
        EC2_USER = "ubuntu"
        EC2_HOST = "ec2-54-172-80-79.compute-1.amazonaws.com"
        SSH_KEY = "/var/lib/jenkins/.ssh/lms_django.pem"
    }

    stages {
        stage('Clone Repository on EC2') {
            steps {
                sh "ssh -o StrictHostKeyChecking=no -i $SSH_KEY $EC2_USER@$EC2_HOST 'if [ ! -d /home/ubuntu/LMS_DEVOPS_Project ]; then git clone https://github.com/MfmRifath/LMS_DEVOPS_Project.git /home/ubuntu/LMS_DEVOPS_Project; else cd /home/ubuntu/LMS_DEVOPS_Project && git pull origin main; fi'"
            }
        }

        stage('Build Docker Image on EC2') {
            steps {
                sh "ssh -o StrictHostKeyChecking=no -i $SSH_KEY $EC2_USER@$EC2_HOST 'cd /home/ubuntu/LMS_DEVOPS_Project && $DOCKER_PATH build -t $IMAGE_NAME .'"
            }
        }

        stage('Stop and Remove Old Container on EC2') {
            steps {
                script {
                    sh "ssh -o StrictHostKeyChecking=no -i $SSH_KEY $EC2_USER@$EC2_HOST '$DOCKER_PATH stop $CONTAINER_NAME || true'"
                    sh "ssh -o StrictHostKeyChecking=no -i $SSH_KEY $EC2_USER@$EC2_HOST '$DOCKER_PATH rm $CONTAINER_NAME || true'"
                }
            }
        }

        stage('Run New Container on EC2') {
            steps {
                sh "ssh -o StrictHostKeyChecking=no -i $SSH_KEY $EC2_USER@$EC2_HOST '$DOCKER_PATH run -d -p 8000:8000 --name $CONTAINER_NAME $IMAGE_NAME'"
            }
        }

        stage('Verify Deployment on EC2') {
            steps {
                sh "ssh -o StrictHostKeyChecking=no -i $SSH_KEY $EC2_USER@$EC2_HOST 'curl -I http://localhost:8000'"
            }
        }
    }
}
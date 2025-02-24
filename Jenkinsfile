pipeline {
    agent any

    environment {
        IMAGE_NAME = "lms_django"
        CONTAINER_NAME = "lms_backend"
        DOCKER_PATH = "/usr/local/bin/docker" // Docker path for local machine
    }

    stages {
        stage('Clone Repository') {
            steps {
                git branch: 'main', url: 'https://github.com/MfmRifath/LMS_DEVOPS_Project.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "$DOCKER_PATH build -t $IMAGE_NAME ."
            }
        }

        stage('Stop and Remove Old Container') {
            steps {
                script {
                    sh "$DOCKER_PATH stop $CONTAINER_NAME || true"
                    sh "$DOCKER_PATH rm $CONTAINER_NAME || true"
                }
            }
        }

        stage('Run New Container') {
            steps {
                sh "$DOCKER_PATH run -d -p 8000:8000 --name $CONTAINER_NAME $IMAGE_NAME"
            }
        }

        stage('Verify Deployment') {
            steps {
                sh "curl -I http://localhost:8000"
            }
        }
    }
}
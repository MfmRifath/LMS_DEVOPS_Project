pipeline {
    agent any

    environment {
        IMAGE_NAME = "lms_django"
        CONTAINER_NAME = "lms_django_container"
    }

    stages {
        stage('Clone Repository') {
            steps {
                git branch: 'main', url: 'https://github.com/yourusername/lms_django.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t $IMAGE_NAME ."
            }
        }

        stage('Stop and Remove Old Container') {
            steps {
                script {
                    sh "docker stop $CONTAINER_NAME || true"
                    sh "docker rm $CONTAINER_NAME || true"
                }
            }
        }

        stage('Run New Container') {
            steps {
                sh "docker run -d -p 8000:8000 --name $CONTAINER_NAME $IMAGE_NAME"
            }
        }
    }
}
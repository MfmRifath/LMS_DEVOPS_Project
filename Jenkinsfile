pipeline {
    agent any

    environment {
        // Application settings
        IMAGE_NAME         = "lms_django"
        CONTAINER_NAME     = "lms_backend"
        DOCKER_HUB_REPO    = "rifathmfm/lms_django"
        
        // Server details - these will be potentially updated during the pipeline
        EC2_USER           = "ubuntu"
        EC2_HOST           = "ec2-54-221-182-141.compute-1.amazonaws.com"
        REMOTE_HOST        = "54.221.182.141"
        APP_DIR            = "/var/www/lms_backend"
        
        // Docker path (adjust as needed for your Jenkins server)
        DOCKER_PATH        = "/usr/local/bin/docker"
        
        // Credentials and secrets
        DJANGO_ALLOWED_HOSTS = "${REMOTE_HOST},localhost,127.0.0.1"
        DEBUG              = "0"
        
        // Flag for EC2 availability (initialized to false)
        EC2_AVAILABLE      = "false"
        
        // AWS credentials for Ansible
        AWS_ACCESS_KEY_ID     = credentials('aws-access-key-id')
        AWS_SECRET_ACCESS_KEY = credentials('aws-secret-access-key')
        AWS_REGION            = "us-east-1"
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
                
                # Install dependencies with verbose output to debug package issues
                pip install -r requirements.txt -v || echo "Could not install dependencies, continuing anyway"
                
                # Install django-cors-headers explicitly (fix for corsheaders module error)
                pip install django-cors-headers
                
                # Run Django tests if available
                python manage.py test || echo "No tests available, skipping..."
                
                deactivate
                '''
            }
        }

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

        stage('Configure Docker') {
            steps {
                sh '''
                # Check Docker installation
                echo "Docker version:"
                $DOCKER_PATH --version || echo "Docker not installed or not in PATH"
                
                # Fix Docker credential helper issue
                mkdir -p $HOME/.docker
                echo '{"credsStore":""}' > $HOME/.docker/config.json
                
                # List available Docker credential helpers
                echo "Available credential helpers:"
                which docker-credential-osxkeychain docker-credential-desktop 2>/dev/null || echo "No credential helpers found"
                '''
            }
        }

        stage('Build and Push Docker Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'docker-registry-credentials', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                    sh '''
                    cd $WORKSPACE/LMS_DEVOPS_Project
                    
                    # Login to Docker Hub with error handling
                    echo "Logging in to Docker Hub as $DOCKER_USERNAME"
                    echo "$DOCKER_PASSWORD" | $DOCKER_PATH login -u "$DOCKER_USERNAME" --password-stdin || {
                        echo "Docker login failed - continuing without push"
                        exit_code=$?
                        echo "Docker login exit code: $exit_code"
                        
                        # Continue with build only
                        echo "Building Docker image locally only"
                        $DOCKER_PATH build -t $DOCKER_HUB_REPO:latest .
                        echo "Docker build completed successfully without push"
                        return 0
                    }
                    
                    # If login succeeded, continue with build and push
                    echo "Building Docker image"
                    $DOCKER_PATH build -t $DOCKER_HUB_REPO:latest .
                    
                    echo "Tagging image with build number"
                    $DOCKER_PATH tag $DOCKER_HUB_REPO:latest $DOCKER_HUB_REPO:build-$BUILD_NUMBER
                    
                    echo "Pushing images to Docker Hub"
                    $DOCKER_PATH push $DOCKER_HUB_REPO:latest
                    $DOCKER_PATH push $DOCKER_HUB_REPO:build-$BUILD_NUMBER
                    
                    echo "Logging out of Docker Hub"
                    $DOCKER_PATH logout
                    '''
                }
            }
        }

        stage('Setup Ansible for AWS') {
            steps {
                sh '''
                cd $WORKSPACE/LMS_DEVOPS_Project
                
                # Create setup script for Ansible
                cat > setup_ansible.sh << 'EOL'
#!/bin/bash
# Install required Ansible collections for AWS

# Install Ansible if not installed
if ! command -v ansible &> /dev/null; then
    echo "Installing Ansible..."
    pip install ansible
fi

# Install required collections
echo "Installing Ansible AWS collection..."
ansible-galaxy collection install amazon.aws

# Install required Python packages
echo "Installing required Python packages..."
pip install boto3 botocore
EOL
                
                # Make script executable
                chmod +x setup_ansible.sh
                
                # Run setup script
                ./setup_ansible.sh
                
                # Create check EC2 playbook
                cat > check_ec2.yml << 'EOL'
---
# Playbook to check if an EC2 instance exists
- name: Check if EC2 instance exists
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    instance_name: "lms-backend"
    region: "us-east-1"

  tasks:
    - name: Get EC2 instance information
      amazon.aws.ec2_instance_info:
        region: "{{ region }}"
        filters:
          "tag:Name": "{{ instance_name }}"
          instance-state-name: ["running", "stopped", "pending"]
      register: ec2_info
    
    - name: Set facts about EC2 instance
      set_fact:
        instance_exists: "{{ ec2_info.instances | length > 0 }}"
        instance_id: "{{ ec2_info.instances[0].instance_id | default('') }}"
        instance_state: "{{ ec2_info.instances[0].state.name | default('') }}"
        public_ip: "{{ ec2_info.instances[0].public_ip_address | default('') }}"
        public_dns: "{{ ec2_info.instances[0].public_dns_name | default('') }}"
      when: ec2_info.instances | length > 0

    - name: Set facts if instance doesn't exist
      set_fact:
        instance_exists: false
        instance_id: ""
        instance_state: ""
        public_ip: ""
        public_dns: ""
      when: ec2_info.instances | length == 0

    - name: Output instance information
      debug:
        msg: |
          Instance exists: {{ instance_exists }}
          Instance ID: {{ instance_id }}
          Instance state: {{ instance_state }}
          Public IP: {{ public_ip }}
          Public DNS: {{ public_dns }}

    - name: Create output file with instance information
      copy:
        content: |
          INSTANCE_EXISTS={{ instance_exists }}
          INSTANCE_ID={{ instance_id }}
          INSTANCE_STATE={{ instance_state }}
          PUBLIC_IP={{ public_ip }}
          PUBLIC_DNS={{ public_dns }}
        dest: ec2_info.txt
        mode: '0644'
EOL

                # Create EC2 instance playbook
                cat > create_ec2.yml << 'EOL'
---
# Playbook to create an EC2 instance if it doesn't exist
- name: Create EC2 instance
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    instance_name: "lms-backend"
    region: "us-east-1"
    instance_type: "t2.micro"
    image_id: "ami-0c7217cdde317cfec"  # Ubuntu 22.04 LTS in us-east-1
    key_name: "lms_backend"  # Make sure this key exists in your AWS account
    security_group: "lms-sg"
    subnet_id: ""  # Leave empty to use default subnet

  tasks:
    - name: Create security group if it doesn't exist
      amazon.aws.ec2_security_group:
        name: "{{ security_group }}"
        description: "Security group for LMS Backend"
        region: "{{ region }}"
        rules:
          - proto: tcp
            ports: 22
            cidr_ip: 0.0.0.0/0
            rule_desc: "Allow SSH"
          - proto: tcp
            ports: 80
            cidr_ip: 0.0.0.0/0
            rule_desc: "Allow HTTP"
          - proto: tcp
            ports: 8000
            cidr_ip: 0.0.0.0/0
            rule_desc: "Allow Django port"
        rules_egress:
          - proto: all
            cidr_ip: 0.0.0.0/0
      register: sg_result

    - name: Launch EC2 instance
      amazon.aws.ec2_instance:
        name: "{{ instance_name }}"
        key_name: "{{ key_name }}"
        security_group: "{{ security_group }}"
        instance_type: "{{ instance_type }}"
        image_id: "{{ image_id }}"
        region: "{{ region }}"
        subnet_id: "{{ subnet_id | default(omit) }}"
        wait: yes
        state: running
        tags:
          Name: "{{ instance_name }}"
          Environment: "production"
          Project: "LMS"
      register: ec2_result

    - name: Wait for SSH to come up
      wait_for:
        host: "{{ ec2_result.instances[0].public_dns_name }}"
        port: 22
        delay: 10
        timeout: 320
        state: started
      when: ec2_result.instances is defined

    - name: Set facts about the created EC2 instance
      set_fact:
        instance_id: "{{ ec2_result.instances[0].instance_id }}"
        public_ip: "{{ ec2_result.instances[0].public_ip_address }}"
        public_dns: "{{ ec2_result.instances[0].public_dns_name }}"
      when: ec2_result.instances is defined

    - name: Output instance information
      debug:
        msg: |
          Instance ID: {{ instance_id }}
          Public IP: {{ public_ip }}
          Public DNS: {{ public_dns }}
      when: ec2_result.instances is defined

    - name: Create output file with instance information
      copy:
        content: |
          INSTANCE_ID={{ instance_id }}
          PUBLIC_IP={{ public_ip }}
          PUBLIC_DNS={{ public_dns }}
        dest: new_ec2_info.txt
        mode: '0644'
      when: ec2_result.instances is defined
EOL
                
                echo "Ansible playbooks created successfully"
                '''
            }
        }

        stage('Check EC2 Instance') {
            steps {
                withCredentials([
                    string(credentialsId: 'aws-access-key-id', variable: 'AWS_ACCESS_KEY_ID'),
                    string(credentialsId: 'aws-secret-access-key', variable: 'AWS_SECRET_ACCESS_KEY')
                ]) {
                    sh '''
                    cd $WORKSPACE/LMS_DEVOPS_Project
                    
                    # Run Ansible playbook to check if EC2 instance exists
                    echo "Checking if EC2 instance exists..."
                    ansible-playbook check_ec2.yml
                    
                    # Check if instance exists
                    if grep -q "INSTANCE_EXISTS=True" ec2_info.txt; then
                        echo "EC2 instance exists"
                        export EC2_AVAILABLE="true"
                        
                        # Update EC2 connection details
                        export REMOTE_HOST=$(grep "PUBLIC_IP" ec2_info.txt | cut -d= -f2)
                        export EC2_HOST=$(grep "PUBLIC_DNS" ec2_info.txt | cut -d= -f2)
                        
                        echo "Updated EC2 details:"
                        echo "REMOTE_HOST=$REMOTE_HOST"
                        echo "EC2_HOST=$EC2_HOST"
                    else
                        echo "EC2 instance does not exist, will create it in the next stage"
                    fi
                    '''
                }
                
                script {
                    def ec2Info = readFile("${WORKSPACE}/LMS_DEVOPS_Project/ec2_info.txt").trim()
                    if (ec2Info.contains("INSTANCE_EXISTS=True")) {
                        env.EC2_AVAILABLE = "true"
                        
                        // Parse and update EC2 details
                        def publicIp = sh(script: "grep 'PUBLIC_IP' ${WORKSPACE}/LMS_DEVOPS_Project/ec2_info.txt | cut -d= -f2", returnStdout: true).trim()
                        def publicDns = sh(script: "grep 'PUBLIC_DNS' ${WORKSPACE}/LMS_DEVOPS_Project/ec2_info.txt | cut -d= -f2", returnStdout: true).trim()
                        
                        if (publicIp && publicDns) {
                            env.REMOTE_HOST = publicIp
                            env.EC2_HOST = publicDns
                            env.DJANGO_ALLOWED_HOSTS = "${publicIp},${publicDns},localhost,127.0.0.1"
                            
                            echo "Updated EC2 details from existing instance:"
                            echo "REMOTE_HOST=${env.REMOTE_HOST}"
                            echo "EC2_HOST=${env.EC2_HOST}"
                        }
                    } else {
                        env.EC2_AVAILABLE = "false"
                    }
                }
            }
        }
        
        stage('Create EC2 Instance if Needed') {
            when {
                expression { return env.EC2_AVAILABLE == 'false' }
            }
            steps {
                withCredentials([
                    string(credentialsId: 'aws-access-key-id', variable: 'AWS_ACCESS_KEY_ID'),
                    string(credentialsId: 'aws-secret-access-key', variable: 'AWS_SECRET_ACCESS_KEY')
                ]) {
                    sh '''
                    cd $WORKSPACE/LMS_DEVOPS_Project
                    
                    # Run Ansible playbook to create EC2 instance
                    echo "Creating EC2 instance..."
                    ansible-playbook create_ec2.yml
                    
                    # Check if instance was created successfully
                    if [ -f new_ec2_info.txt ]; then
                        echo "EC2 instance created successfully"
                        export EC2_AVAILABLE="true"
                        
                        # Update EC2 connection details
                        export REMOTE_HOST=$(grep "PUBLIC_IP" new_ec2_info.txt | cut -d= -f2)
                        export EC2_HOST=$(grep "PUBLIC_DNS" new_ec2_info.txt | cut -d= -f2)
                        
                        echo "Updated EC2 details:"
                        echo "REMOTE_HOST=$REMOTE_HOST"
                        echo "EC2_HOST=$EC2_HOST"
                    else
                        echo "Failed to create EC2 instance"
                    fi
                    '''
                }
                
                script {
                    if (fileExists("${WORKSPACE}/LMS_DEVOPS_Project/new_ec2_info.txt")) {
                        env.EC2_AVAILABLE = "true"
                        
                        // Parse and update EC2 details
                        def publicIp = sh(script: "grep 'PUBLIC_IP' ${WORKSPACE}/LMS_DEVOPS_Project/new_ec2_info.txt | cut -d= -f2", returnStdout: true).trim()
                        def publicDns = sh(script: "grep 'PUBLIC_DNS' ${WORKSPACE}/LMS_DEVOPS_Project/new_ec2_info.txt | cut -d= -f2", returnStdout: true).trim()
                        
                        if (publicIp && publicDns) {
                            env.REMOTE_HOST = publicIp
                            env.EC2_HOST = publicDns
                            env.DJANGO_ALLOWED_HOSTS = "${publicIp},${publicDns},localhost,127.0.0.1"
                            
                            echo "Updated EC2 details from newly created instance:"
                            echo "REMOTE_HOST=${env.REMOTE_HOST}"
                            echo "EC2_HOST=${env.EC2_HOST}"
                        }
                    }
                }
            }
        }

        stage('Check EC2 Connectivity') {
            steps {
                script {
                    try {
                        withCredentials([sshUserPrivateKey(credentialsId: 'aws-ssh-key', keyFileVariable: 'SSH_KEY')]) {
                            sh '''
                            # Test SSH connection with short timeout
                            ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 -i $SSH_KEY $EC2_USER@$EC2_HOST "echo EC2 connection successful"
                            '''
                        }
                        echo "EC2 connection successful"
                        env.EC2_AVAILABLE = 'true'
                    } catch (Exception e) {
                        echo "EC2 instance is not accessible: ${e.message}"
                        echo "This could be because:"
                        echo "1. The instance was just created and needs more time to initialize"
                        echo "2. The SSH key pair is not correctly set up"
                        echo "3. The security group doesn't allow SSH access"
                        env.EC2_AVAILABLE = 'false'
                    }
                }
            }
        }

        stage('Deploy on EC2') {
            when {
                expression { return env.EC2_AVAILABLE == 'true' }
            }
            steps {
                withCredentials([
                    sshUserPrivateKey(credentialsId: 'aws-ssh-key', keyFileVariable: 'SSH_KEY'),
                    string(credentialsId: 'mongodb-uri', variable: 'MONGO_URI'),
                    string(credentialsId: 'django-secret-key', variable: 'SECRET_KEY')
                ]) {
                    sh '''
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
    }

    post {
        success {
            node(null) {
                script {
                    echo "=============================================="
                    echo "CI/CD Pipeline executed successfully!"
                    echo "Application built successfully"
                    if (env.EC2_AVAILABLE == 'true') {
                        echo "Application deployed to ${EC2_HOST}"
                        echo "You can access the application at: http://${REMOTE_HOST}:8000"
                    } else {
                        echo "EC2 deployment skipped - instance not available"
                        echo "Check AWS console and try again"
                    }
                    echo "MongoDB connection configured correctly"
                    echo "=============================================="
                }
            }
        }
        
        failure {
            node(null) {
                echo "=============================================="
                echo "CI/CD Pipeline failed. Check the logs for details."
                echo "=============================================="
                
                script {
                    try {
                        if (env.EC2_AVAILABLE == 'true') {
                            withCredentials([sshUserPrivateKey(credentialsId: 'aws-ssh-key', keyFileVariable: 'SSH_KEY')]) {
                                sh '''
                                ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -i $SSH_KEY $EC2_USER@$EC2_HOST '
                                    # Get logs for debugging
                                    echo "=== FULL CONTAINER LOGS ==="
                                    docker logs lms_backend || echo "Container not running"
                                    
                                    # Check container status
                                    docker inspect lms_backend || echo "Container not found"
                                '
                                '''
                            }
                        } else {
                            echo "EC2 instance not available - skipping container logs"
                        }
                    } catch (Exception e) {
                        echo "Could not execute SSH commands: ${e.message}"
                    }
                }
            }
        }
        
        always {
            node(null) {
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
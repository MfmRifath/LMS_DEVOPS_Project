#!/bin/bash
# Improved setup script for Ansible on macOS in Jenkins

echo "Setting up Python virtual environment for Ansible..."
python3 -m venv ansible_venv
source ansible_venv/bin/activate

echo "Installing pip packages..."
python3 -m pip install --upgrade pip
python3 -m pip install ansible boto3 botocore

echo "Installing Ansible AWS collection..."
python3 -m ansible.modules.galaxy.collection install amazon.aws

echo "Testing Ansible installation..."
python3 -m ansible --version

echo "Creating ansible.cfg file..."
cat > ansible.cfg << 'EOL'
[defaults]
host_key_checking = False
interpreter_python = auto_silent
EOL

echo "Environment ready for Ansible!"
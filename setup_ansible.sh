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
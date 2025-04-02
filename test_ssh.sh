#!/bin/bash
SSH_KEY="$1"
EC2_USER="$2"
EC2_DNS="$3"

# Test SSH connection with proper syntax
echo "Testing SSH connection to $EC2_USER@$EC2_DNS"
if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -i "$SSH_KEY" "$EC2_USER@$EC2_DNS" "echo SSH_CONNECTION_SUCCESSFUL"; then
    echo "SSH connection successful"
    echo "EC2_SSH=successful" > $WORKSPACE/ssh_status.sh
else
    echo "SSH connection failed"
    echo "EC2_SSH=failed" > $WORKSPACE/ssh_status.sh
fi
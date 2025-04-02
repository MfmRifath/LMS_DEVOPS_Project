#!/bin/bash
# EC2 Instance Information
# This file is sourced by the Jenkins pipeline to get EC2 details

# Set status to 'available' to simulate having an instance
EC2_STATUS=available

# Replace with your actual EC2 instance public IP
EC2_IP=35.171.26.87

# Replace with your actual EC2 instance public DNS
EC2_DNS=ec2-35-171-26-87.compute-1.amazonaws.com

# Comma-separated list of allowed hosts for Django
EC2_ALLOWED_HOSTS=$EC2_IP,$EC2_DNS,localhost,127.0.0.1
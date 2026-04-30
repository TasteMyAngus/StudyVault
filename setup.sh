#!/bin/bash
# Quick setup script for StudyVault

echo "Setting up StudyVault backend..."

# Create Python venv
python -m venv venv
./venv/Scripts/activate.ps1  # On Windows

# Install dependencies
pip install -r requirements.txt

# Initialize database
python db/schema.py

echo "Backend setup complete"
echo ""
echo "To start the API:"
echo "   cd backend && python main.py"
echo ""
echo "To start the frontend:"
echo "   cd frontend && npm install && npm start"

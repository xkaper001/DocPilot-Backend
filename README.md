# DocPilot - Backend

This repository contains the backend components for the [DocPilot](https://github.com/xkaper001/DocPilot) project. DocPilot is a healthcare application designed to streamline doctor-patient interactions, medical documentation, and prescription management.

## 📋 Project Structure

```
DocPilot-Backend/
├── functions/                     # Appwrite serverless functions
│   ├── Generate Doctor Certificate/  # Function to generate doctor certificates
│   └── Generate Prescription/        # Function to generate prescriptions
├── other/                         # Utility scripts and function templates
│   ├── aw_function_prescribe.js   # Prescription generation using AI
│   └── generate_certificate.js    # Certificate generation utility
└── setup/                         # Setup scripts
    ├── package.json               # Dependencies for setup
    └── setup_appwrite.js          # Appwrite database and collection setup script
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0 or higher)
- [Appwrite](https://appwrite.io/) account and project
- Appwrite CLI (optional, for local development)

### Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/your-repo/DocPilot-Backend.git
   cd DocPilot-Backend
   ```

2. Set up the Appwrite backend:
   ```bash
   cd setup
   npm install
   npm run setup
   ```
   Follow the prompts to configure your Appwrite project.

3. Deploy the functions to Appwrite:
   - You can use the Appwrite Console to upload the functions
   - Or use the Appwrite CLI to deploy them

## 🔧 Appwrite Configuration

The setup script will create:

- A database called `dbDocpilot`
- Collections:
  - `patients`: Patient information
  - `doctors`: Doctor information
  - `appointments`: Appointment scheduling
  - `prescriptions`: Patient prescriptions

## 💻 Functions

### Generate Doctor Certificate

This function generates PFX certificates for doctors to authenticate and digitally sign prescriptions and medical documents.

### Generate Prescription

This function generates and manages digital prescriptions, with support for structured medical data including:
- Patient symptoms
- Diagnosis
- Medications (name, dosage, frequency)
- Suggested tests
- Follow-up instructions

## 🔒 Security

- The certificate generation function uses strong RSA encryption (4096-bit)
- PFX certificates are password-protected
- All communication with Appwrite uses API keys and secure authentication

## 🧰 Development

To modify or extend the functions:

1. Navigate to the function directory:
   ```bash
   cd functions/Generate\ Prescription
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Modify the source code in `src/main.js`

4. Deploy the updated function to Appwrite

## 🤝 Contributing

Contributions to DocPilot are welcome! Please check out the main project repository at [https://github.com/xkaper001/DocPilot](https://github.com/xkaper001/DocPilot) for contribution guidelines.
#!/usr/bin/env node

import { Client, Databases, ID, RelationshipType, RelationMutate, Role, Permission } from 'node-appwrite';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { createSpinner } from 'nanospinner';

// Text styling
const success = chalk.bold.green;
const info = chalk.blue;
const error = chalk.bold.red;
const highlight = chalk.yellow;

/**
 * Setup Appwrite by creating database and collections for DocPilot application
 */
async function setupAppwrite() {
    console.log(info('+--------------------------------------------+'));
    console.log(info('| 📝 Appwrite Setup Script for DocPilot      |'));
    console.log(info('+--------------------------------------------+\n'));

    try {
        // Gather credentials and configuration
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'endpoint',
                message: 'Enter your Appwrite endpoint:',
                default: 'https://cloud.appwrite.io/v1',
                validate: input => input.trim() !== '' ? true : 'Endpoint is required'
            },
            {
                type: 'input',
                name: 'projectId',
                message: 'Enter your Appwrite project ID:',
                validate: input => input.trim() !== '' ? true : 'Project ID is required'
            },
            {
                type: 'password',
                name: 'apiKey',
                message: 'Enter your Appwrite API key (with permissions to create databases and collections):',
                validate: input => input.trim() !== '' ? true : 'API key is required'
            }
        ]);

        // Database settings (fixed for DocPilot)
        const databaseId = 'dbDocpilot';
        const databaseName = 'DocPilot Database';

        // Initialize Appwrite client
        const connectingSpinner = createSpinner('Connecting to Appwrite...').start();
        const client = new Client()
            .setEndpoint(answers.endpoint)
            .setProject(answers.projectId)
            .setKey(answers.apiKey);

        // Small delay to make the spinner visible
        await new Promise(resolve => setTimeout(resolve, 500));
        connectingSpinner.success({ text: 'Connected to Appwrite!' });

        const databases = new Databases(client);

        // Create database (if it doesn't exist)
        const dbSpinner = createSpinner(`Creating database '${databaseId}'...`).start();
        try {
            let database = await databases.get(databaseId);
            dbSpinner.success({ text: `Database '${databaseId}' already exists. Using it.` });
        } catch (err) {
            if (err.code === 404) {
                let database = await databases.create(databaseId, databaseName);
                dbSpinner.success({ text: `Created database: ${highlight(databaseName)}` });
            } else {
                dbSpinner.error({ text: `Failed to create database: ${err.message}` });
                throw err;
            }
        }

        // Create Patients collection
        await createCollection(databases, databaseId, 'patients', 'Patients');
        await createAttributes(databases, databaseId, 'patients', [
            { name: 'full_name', type: 'string', required: true, size: 255 },
            { name: 'dob', type: 'datetime', required: true },
            { name: 'gender', type: 'string', required: true, size: 20 },
            { name: 'contact_number', type: 'integer', required: true },
            { name: 'email', type: 'email', required: true },
            { name: 'allergies', type: 'string', required: false, size: 255, array: true },
            { name: 'medical_history', type: 'string', required: false, size: 2000 },
            { name: 'ongoing_medications', type: 'string', required: false, size: 255, array: true },
            { name: 'lifestyle_habits', type: 'string', required: false, size: 500 },
            { name: 'insurance_id', type: 'string', required: false, size: 100 } 
        ]);

        // Create Doctors collection
        await createCollection(databases, databaseId, 'doctors', 'Doctors');
        await createAttributes(databases, databaseId, 'doctors', [
            { name: 'full_name', type: 'string', required: true, size: 255 },
            { name: 'sign_id', type: 'string', required: true, size: 100 },
            { name: 'specialization', type: 'string', required: true, size: 100 },
            { name: 'contact_number', type: 'integer', required: true },
            { name: 'email', type: 'email', required: true },
            { name: 'clinic_address', type: 'string', required: true, size: 500 }
        ]);

        // Create Appointments collection
        await createCollection(databases, databaseId, 'appointments', 'Appointments');
        await createAttributes(databases, databaseId, 'appointments', [
            { name: 'appointment_date', type: 'datetime', required: true },
            { name: 'status', type: 'enum', required: true, elements: ['Scheduled', 'Completed', 'Cancelled'] }
        ]);

        // Create Prescriptions collection
        await createCollection(databases, databaseId, 'prescriptions', 'Prescriptions');
        await createAttributes(databases, databaseId, 'prescriptions', [
            { name: 'signed_by', type: 'string', required: false },
            { name: 'signed_at', type: 'datetime', required: false },
            { name: 'is_signed', type: 'boolean', required: false, default: false },
            { name: 'symptoms', type: 'string', required: false, array: true },
            { name: 'diagnosis', type: 'string', required: false, array: true },
            { name: 'medications', type: 'string', required: false, array: true },
            { name: 'tests', type: 'string', required: false, array: true },
            { name: 'additional_notes', type: 'string', required: false, size: 1000 },
        ]);

        // Create relationships between collections
        await createRelationships(databases, databaseId);

        console.log(success('\n🎉 Setup completed successfully!'));
        console.log(info(`
Summary:
- Database: ${highlight(databaseId)} (${databaseName})
- Collections created:
  - ${highlight('patients')} (Patients)
  - ${highlight('doctors')} (Doctors)
  - ${highlight('appointments')} (Appointments)
  - ${highlight('prescriptions')} (Prescriptions)
- All attributes and relationships set up according to the schema
`));

    } catch (err) {
        console.log(error(`\n❌ Setup failed: ${err.message || err}`));
        if (err.response) {
            console.log(error(`Response: ${JSON.stringify(err.response, null, 2)}`));
        }
        process.exit(1);
    }
}

/**
 * Helper function to create a collection if it doesn't exist
 */
async function createCollection(databases, databaseId, collectionId, collectionName) {
    const collectionSpinner = createSpinner(`Creating collection '${collectionId}'...`).start();
    try {
        let collection = await databases.getCollection(databaseId, collectionId);
        collectionSpinner.success({ text: `Collection '${collectionId}' already exists. Using it.` });
    } catch (err) {
        if (err.code === 404) {
            let collection = await databases.createCollection(
                databaseId,
                collectionId,
                collectionName,
                [
                    Permission.read(Role.any()), // Public read
                    Permission.create(Role.users()), // Authenticated users can create
                    Permission.update(Role.users()), // Authenticated users can update
                    Permission.delete(Role.users()) // Authenticated users can delete
                ]
            );
            collectionSpinner.success({ text: `Created collection: ${highlight(collectionName)}` });
        } else {
            collectionSpinner.error({ text: `Failed to create collection: ${err.message}` });
            throw err;
        }
    }
}

/**
 * Helper function to create attributes for a collection
 */
async function createAttributes(databases, databaseId, collectionId, attributes) {
    const attrSpinner = createSpinner(`Creating attributes for '${collectionId}'...`).start();
    try {
        // Get existing attributes to avoid recreating
        const existingAttrs = await databases.listAttributes(databaseId, collectionId);
        const existingKeys = existingAttrs.attributes.map(attr => attr.key);

        for (const attr of attributes) {
            if (existingKeys.includes(attr.name)) {
                continue; // Skip if attribute already exists
            }

            switch (attr.type) {
                case 'string':
                    await databases.createStringAttribute(
                        databaseId,
                        collectionId,
                        attr.name,
                        attr.size || 255,
                        attr.required,
                        null,
                        attr.array || false
                    );
                    break;
                case 'integer':
                    await databases.createIntegerAttribute(
                        databaseId,
                        collectionId,
                        attr.name,
                        attr.required,
                        attr.min,
                        attr.max,
                        null,
                        attr.array || false
                    );
                    break;
                case 'datetime':
                    await databases.createDatetimeAttribute(
                        databaseId,
                        collectionId,
                        attr.name,
                        attr.required,
                        null,
                        attr.array || false
                    );
                    break;
                case 'email':
                    await databases.createEmailAttribute(
                        databaseId,
                        collectionId,
                        attr.name,
                        attr.required,
                        null,
                        attr.array || false
                    );
                    break;
                case 'enum':
                    await databases.createEnumAttribute(
                        databaseId,
                        collectionId,
                        attr.name,
                        attr.elements,
                        attr.required,
                        null,
                        attr.array || false
                    );
                    break;
                case 'boolean':
                    await databases.createBooleanAttribute(
                        databaseId,
                        collectionId,
                        attr.name,
                        attr.required,
                        null,
                        attr.array || false
                    );
                    break;
                default:
                    console.log(error(`Unsupported attribute type: ${attr.type}`));
            }
        }
        attrSpinner.success({ text: `Created attributes for ${highlight(collectionId)}` });
    } catch (err) {
        attrSpinner.error({ text: `Failed to create attributes: ${err.message}` });
        throw err;
    }
}

/**
 * Helper function to create relationships between collections
 */
async function createRelationships(databases, databaseId) {
    const relationshipSpinner = createSpinner('Setting up relationships...').start();
    try {
        // 1. Patient to Appointments (1-to-Many)
        await createRelationship(
            databases,
            databaseId,
            'patients',
            'appointments',
            RelationshipType.OneToMany,
            'patient_appointments',
        )
        
        await createRelationship(
            databases,
            databaseId,
            'appointments',
            'patients',
            RelationshipType.ManyToOne,
            'patient'
        );
        
        
        // 2. Doctor to Appointments (1-to-Many)
        await createRelationship(
            databases,
            databaseId,
            'appointments',
            'doctors',
            RelationshipType.ManyToOne,
            'doctor'
        );

        await createRelationship(
            databases,
            databaseId,
            'doctors',
            'appointments',
            RelationshipType.OneToMany,
            'doctor_appointments'
        )

        await createRelationship(
            databases,
            databaseId,
            'doctors',
            'patients',
            RelationshipType.OneToMany,
            'patients'
        )

        // 3. Appointments to Prescriptions (1-to-Many)
        await createRelationship(
            databases,
            databaseId,
            'prescriptions',
            'appointments',
            RelationshipType.ManyToOne,
            'appointment_id'
        );

        // 4. Patient to Prescriptions
        await createRelationship(
            databases,
            databaseId,
            'prescriptions',
            'patients',
            RelationshipType.ManyToOne,
            'patient_id'
        );

        // 5. Doctor to Prescriptions
        await createRelationship(
            databases,
            databaseId,
            'prescriptions',
            'doctors',
            RelationshipType.ManyToOne,
            'doctor_id'
        );

        relationshipSpinner.success({ text: `Created relationships successfully` });
    } catch (err) {
        relationshipSpinner.error({ text: `Failed to create relationships: ${err.message}` });
        throw err;
    }
}

/**
 * Helper function to create a relationship between two collections
 */
async function createRelationship(databases, databaseId, collectionId, relatedCollectionId, type, key = '', twoWay = false, twoWayKey = null, onDelete = RelationMutate.Cascade) {
    try {
        await databases.createRelationshipAttribute(
            databaseId,
            collectionId,
            relatedCollectionId,
            type,
            twoWay,
            key,
            twoWayKey,
            onDelete
        );
    } catch (err) {
        // If relationship already exists, continue
        if (err.code !== 409) {
            throw err;
        }
    }
}

// Run the script
setupAppwrite();
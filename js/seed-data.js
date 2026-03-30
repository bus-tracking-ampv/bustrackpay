import { db, ref, set } from './firebase-config.js';

async function seedData() {
    console.log("Starting data seeding for Ashokrao Mane Polytechnic Vathar...");

    // 1. Seed Drivers
    const drivers = {
        "DRV001": {
            name: "Sanjay Patil",
            driverId: "DRV001",
            password: "password123",
            licenseNo: "MH-09-2023-001234",
            busNo: "42",
            phone: "+91 98223 12345",
            updatedAt: Date.now()
        },
        "DRV002": {
            name: "Vijay More",
            driverId: "DRV002",
            password: "password123",
            licenseNo: "MH-09-2023-005678",
            busNo: "15",
            phone: "+91 94220 54321",
            updatedAt: Date.now()
        }
    };

    // 2. Seed Students
    const students = {
        "STU101": {
            name: "Rohan Deshmukh",
            enrollmentId: "STU101",
            password: "password123",
            busNo: "42",
            feeStatus: "Paid",
            passStatus: "Valid",
            updatedAt: Date.now()
        },
        "STU102": {
            name: "Anjali Kulkarni",
            enrollmentId: "STU102",
            password: "password123",
            busNo: "42",
            feeStatus: "Pending",
            passStatus: "Valid",
            updatedAt: Date.now()
        },
        "STU103": {
            name: "Sagar Shinde",
            enrollmentId: "STU103",
            password: "password123",
            busNo: "15",
            feeStatus: "Paid",
            passStatus: "Valid",
            updatedAt: Date.now()
        }
    };

    // 3. Seed Routes
    const routes = {
        "route-42": {
            name: "Bhadgoan City Route",
            busNo: "42",
            stops: ["Bhadgoan Gate", "Market Circle", "Shivaji Statu", "Station Road", "College Campus"],
            updatedAt: Date.now()
        },
        "route-15": {
            name: "Vathar Rural Route",
            busNo: "15",
            stops: ["Vathar Bus Stand", "Old Post Office", "Tehsil Road", "College Campus"],
            updatedAt: Date.now()
        }
    };

    try {
        await set(ref(db, 'drivers'), drivers);
        await set(ref(db, 'students'), students);
        await set(ref(db, 'routes'), routes);
        console.log("Institutional data seeded successfully!");
    } catch (e) {
        console.error("Seeding failed:", e);
    }
}

// Expose to window for manual trigger from console if needed, or just run
seedData();

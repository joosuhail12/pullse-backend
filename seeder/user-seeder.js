require('dotenv').config();
const prompts = require('prompts');
const { createClient } = require('@supabase/supabase-js');
const UserService = require('../services/UserService');

const SUPABASE_URL = process.env.SUPABASE_URL || "https://your-supabase-url.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "your-supabase-key";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const inputFields = [
  { type: 'text', name: 'fName', message: 'User First Name:' },
  { type: 'text', name: 'lName', message: 'User Last Name:' },
  { type: 'text', name: 'email', message: 'User Email:' },
  { type: 'password', name: 'password', message: 'User Password:' },
  { type: 'text', name: 'role', message: 'Role:' },
];

const userSeeder = async () => {
  try {
    console.log("🔹 Connecting to Supabase...");

    // Prompt user for input
    const response = await prompts(inputFields, {
      onCancel: () => {
        console.log('❌ Request cancelled.');
        process.exit(1);
      }
    });

    response.createdBy = "CLI";

    // Validate input
    if (!response.fName || !response.lName || !response.email || !response.password || !response.role) {
      console.error("❌ All fields are required.");
      process.exit(1);
    }

    // Check if user already exists
    console.log(`🔍 Checking if user with email ${response.email} already exists...`);
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', response.email)
      .single();

    if (existingUser) {
      console.error(`⚠️ User with email "${response.email}" already exists.`);
      process.exit(1);
    }

    // Create user
    console.log("🚀 Creating user...");
    const userInst = new UserService();
    let user = await userInst.createUser(response);

    console.log("✅ User created successfully:", user);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error while creating user:", err.message);
    process.exit(1);
  }
};

userSeeder();

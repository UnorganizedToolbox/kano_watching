const fs = require('fs');

// Bump Sidebar
let sidebar = fs.readFileSync('src/app/(app)/components/Sidebar.tsx', 'utf8');
sidebar = sidebar.replace(/v0\.0\.2\.0/g, 'v0.0.3.0');
fs.writeFileSync('src/app/(app)/components/Sidebar.tsx', sidebar);

// Bump Project Memory
let memory = fs.readFileSync('PROJECT_MEMORY.md', 'utf8');
memory = memory.replace(/v0\.0\.2\.0/g, 'v0.0.3.0');
fs.writeFileSync('PROJECT_MEMORY.md', memory);

// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const { Octokit } = require('@octokit/rest');
// const OpenAI = require('openai');

// const app = express();
// app.use(cors());
// app.use(express.json({ limit: '50mb' }));

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY
// });

// const octokit = new Octokit({
//   auth: process.env.GITHUB_TOKEN
// });

// const SECRET_KEY = process.env.SECRET_KEY;
// const GITHUB_USERNAME = process.env.GITHUB_USERNAME;

// // In-memory store for processing (use DB in production)
// const processingQueue = new Map();

// // Health check endpoint
// app.get('/health', (req, res) => {
//   res.json({ status: 'ok', timestamp: new Date().toISOString() });
// });

// // Main endpoint to receive task requests
// app.post('/api/deploy', async (req, res) => {
//   try {
//     const {
//       email,
//       secret,
//       task,
//       round,
//       nonce,
//       brief,
//       checks,
//       evaluation_url,
//       attachments
//     } = req.body;

//     // Validate secret
//     if (secret !== SECRET_KEY) {
//       return res.status(401).json({
//         error: 'Invalid secret',
//         message: 'Secret key does not match'
//       });
//     }

//     // Validate required fields
//     if (!email || !task || !brief || !evaluation_url || !nonce) {
//       return res.status(400).json({
//         error: 'Missing required fields',
//         required: ['email', 'task', 'brief', 'evaluation_url', 'nonce']
//       });
//     }

//     console.log(`\n=== Received ${round === 2 ? 'UPDATE' : 'NEW'} Request ===`);
//     console.log(`Task: ${task}`);
//     console.log(`Round: ${round}`);
//     console.log(`Email: ${email}`);
//     console.log(`Brief: ${brief}`);

//     // Send immediate 200 response
//     res.status(200).json({
//       status: 'accepted',
//       message: 'Request received and processing',
//       task,
//       round,
//       nonce
//     });

//     // Process asynchronously
//     processDeployment({
//       email,
//       task,
//       round: round || 1,
//       nonce,
//       brief,
//       checks,
//       evaluation_url,
//       attachments: attachments || []
//     }).catch(err => {
//       console.error('Deployment processing error:', err);
//     });

//   } catch (error) {
//     console.error('Request handling error:', error);
//     res.status(500).json({
//       error: 'Internal server error',
//       message: error.message
//     });
//   }
// });

// // Process deployment asynchronously
// async function processDeployment(requestData) {
//   const {
//     email,
//     task,
//     round,
//     nonce,
//     brief,
//     checks,
//     evaluation_url,
//     attachments
//   } = requestData;

//   try {
//     const repoName = sanitizeRepoName(task);
    
//     console.log(`\n--- Processing Deployment ---`);
//     console.log(`Repo Name: ${repoName}`);

//     let repoUrl, commitSha, pagesUrl;

//     if (round === 1) {
//       // Create new repository
//       ({ repoUrl, commitSha, pagesUrl } = await createNewRepo(
//         repoName,
//         brief,
//         checks,
//         attachments
//       ));
//     } else {
//       // Update existing repository
//       ({ repoUrl, commitSha, pagesUrl } = await updateExistingRepo(
//         repoName,
//         brief,
//         checks,
//         attachments
//       ));
//     }

//     console.log(`\n--- Deployment Complete ---`);
//     console.log(`Repo: ${repoUrl}`);
//     console.log(`Commit: ${commitSha}`);
//     console.log(`Pages: ${pagesUrl}`);

//     // Notify evaluation endpoint
//     await notifyEvaluationEndpoint(
//       evaluation_url,
//       {
//         email,
//         task,
//         round,
//         nonce,
//         repo_url: repoUrl,
//         commit_sha: commitSha,
//         pages_url: pagesUrl
//       }
//     );

//     console.log(`✅ Successfully notified evaluation endpoint`);

//   } catch (error) {
//     console.error('Deployment failed:', error);
//     throw error;
//   }
// }

// // Create new repository for Round 1
// async function createNewRepo(repoName, brief, checks, attachments) {
//   console.log(`\n📦 Creating new repository: ${repoName}`);

//   // Generate code using OpenAI
//   const generatedCode = await generateCodeWithLLM(brief, checks, attachments);

//   // Create repository
//   const { data: repo } = await octokit.repos.createForAuthenticatedUser({
//     name: repoName,
//     description: `Auto-generated app: ${brief.substring(0, 100)}`,
//     auto_init: false,
//     private: false
//   });

//   console.log(`✅ Repository created: ${repo.html_url}`);

//   // Create files
//   const files = {
//     'index.html': generatedCode.html,
//     'README.md': generatedCode.readme,
//     'LICENSE': getMITLicense()
//   };

//   // Upload files
//   for (const [filename, content] of Object.entries(files)) {
//     await octokit.repos.createOrUpdateFileContents({
//       owner: GITHUB_USERNAME,
//       repo: repoName,
//       path: filename,
//       message: `Add ${filename}`,
//       content: Buffer.from(content).toString('base64')
//     });
//     console.log(`✅ Uploaded: ${filename}`);
//   }

//   // Get latest commit SHA
//   const { data: refs } = await octokit.git.getRef({
//     owner: GITHUB_USERNAME,
//     repo: repoName,
//     ref: 'heads/main'
//   });
//   const commitSha = refs.object.sha;

//   // Enable GitHub Pages
//   await enableGitHubPages(repoName);

//   const repoUrl = repo.html_url;
//   const pagesUrl = `https://${GITHUB_USERNAME}.github.io/${repoName}/`;

//   return { repoUrl, commitSha, pagesUrl };
// }

// // Update existing repository for Round 2
// async function updateExistingRepo(repoName, brief, checks, attachments) {
//   console.log(`\n🔄 Updating existing repository: ${repoName}`);

//   // Get current files
//   let currentHtml = '';
//   try {
//     const { data: currentFile } = await octokit.repos.getContent({
//       owner: GITHUB_USERNAME,
//       repo: repoName,
//       path: 'index.html'
//     });
//     currentHtml = Buffer.from(currentFile.content, 'base64').toString('utf8');
//   } catch (error) {
//     console.log('Could not fetch existing file, will create new');
//   }

//   // Generate updated code
//   const updatedCode = await updateCodeWithLLM(
//     currentHtml,
//     brief,
//     checks,
//     attachments
//   );

//   // Update files
//   const files = {
//     'index.html': updatedCode.html,
//     'README.md': updatedCode.readme
//   };

//   for (const [filename, content] of Object.entries(files)) {
//     try {
//       // Get current file SHA
//       const { data: currentFile } = await octokit.repos.getContent({
//         owner: GITHUB_USERNAME,
//         repo: repoName,
//         path: filename
//       });

//       await octokit.repos.createOrUpdateFileContents({
//         owner: GITHUB_USERNAME,
//         repo: repoName,
//         path: filename,
//         message: `Update ${filename} - Round 2`,
//         content: Buffer.from(content).toString('base64'),
//         sha: currentFile.sha
//       });
//     } catch (error) {
//       // File might not exist, create it
//       await octokit.repos.createOrUpdateFileContents({
//         owner: GITHUB_USERNAME,
//         repo: repoName,
//         path: filename,
//         message: `Add ${filename} - Round 2`,
//         content: Buffer.from(content).toString('base64')
//       });
//     }
//     console.log(`✅ Updated: ${filename}`);
//   }

//   // Get latest commit SHA
//   const { data: refs } = await octokit.git.getRef({
//     owner: GITHUB_USERNAME,
//     repo: repoName,
//     ref: 'heads/main'
//   });
//   const commitSha = refs.object.sha;

//   const repoUrl = `https://github.com/${GITHUB_USERNAME}/${repoName}`;
//   const pagesUrl = `https://${GITHUB_USERNAME}.github.io/${repoName}/`;

//   return { repoUrl, commitSha, pagesUrl };
// }

// // Generate code using OpenAI
// async function generateCodeWithLLM(brief, checks, attachments) {
//   console.log(`\n🤖 Generating code with OpenAI...`);

//   const attachmentInfo = attachments.length > 0
//     ? `\n\nAttachments provided:\n${attachments.map(a => `- ${a.name}`).join('\n')}`
//     : '';

//   const checksInfo = checks && checks.length > 0
//     ? `\n\nRequired checks:\n${checks.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
//     : '';

//   const prompt = `You are an expert web developer. Create a single-page HTML application based on this brief:

// ${brief}${attachmentInfo}${checksInfo}

// Requirements:
// - Create a COMPLETE, working HTML file with embedded CSS and JavaScript
// - Include all necessary CDN links for libraries (Bootstrap, marked.js, etc.)
// - Handle attachments by embedding data URIs directly in the code
// - Make it fully functional and production-ready
// - Use modern, clean design
// - Add proper error handling
// - Include comments explaining key sections

// Return ONLY valid HTML code, no explanations.`;

//   const completion = await openai.chat.completions.create({
//     model: "gpt-4o",
//     messages: [
//       {
//         role: "system",
//         content: "You are an expert web developer who creates complete, functional HTML applications."
//       },
//       {
//         role: "user",
//         content: prompt
//       }
//     ],
//     temperature: 0.7,
//     max_tokens: 4000
//   });

//   const html = completion.choices[0].message.content.trim();

//   // Generate README
//   const readme = await generateReadme(brief, checks);

//   console.log(`✅ Code generated successfully`);

//   return { html, readme };
// }

// // Update code using OpenAI
// async function updateCodeWithLLM(currentHtml, brief, checks, attachments) {
//   console.log(`\n🤖 Updating code with OpenAI...`);

//   const attachmentInfo = attachments.length > 0
//     ? `\n\nNew attachments:\n${attachments.map(a => `- ${a.name}`).join('\n')}`
//     : '';

//   const checksInfo = checks && checks.length > 0
//     ? `\n\nAdditional checks:\n${checks.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
//     : '';

//   const prompt = `You are an expert web developer. Update this HTML application:

// CURRENT CODE:
// \`\`\`html
// ${currentHtml.substring(0, 3000)}
// \`\`\`

// UPDATE REQUEST:
// ${brief}${attachmentInfo}${checksInfo}

// Requirements:
// - Modify the existing code to add the requested features
// - Keep all existing functionality working
// - Maintain code quality and structure
// - Add proper comments for new features
// - Ensure backward compatibility

// Return ONLY the complete updated HTML code, no explanations.`;

//   const completion = await openai.chat.completions.create({
//     model: "gpt-4o",
//     messages: [
//       {
//         role: "system",
//         content: "You are an expert web developer who updates and improves existing code."
//       },
//       {
//         role: "user",
//         content: prompt
//       }
//     ],
//     temperature: 0.7,
//     max_tokens: 4000
//   });

//   const html = completion.choices[0].message.content.trim();

//   // Update README
//   const readme = await generateReadme(brief, checks, true);

//   console.log(`✅ Code updated successfully`);

//   return { html, readme };
// }

// // Generate README
// async function generateReadme(brief, checks, isUpdate = false) {
//   const prompt = `Create a professional README.md for a web application:

// Brief: ${brief}

// ${checks && checks.length > 0 ? `Features:\n${checks.map(c => `- ${c}`).join('\n')}` : ''}

// Include these sections:
// 1. Project Title (based on brief)
// 2. Description (2-3 sentences)
// 3. Features (bullet points)
// 4. Setup Instructions (how to run locally)
// 5. Usage (how to use the app)
// 6. Technologies Used
// 7. License (MIT)

// Keep it concise and professional.`;

//   const completion = await openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     messages: [
//       { role: "system", content: "You are a technical writer creating README files." },
//       { role: "user", content: prompt }
//     ],
//     temperature: 0.5,
//     max_tokens: 1000
//   });

//   return completion.choices[0].message.content.trim();
// }

// // Enable GitHub Pages
// async function enableGitHubPages(repoName) {
//   try {
//     await octokit.repos.createPagesSite({
//       owner: GITHUB_USERNAME,
//       repo: repoName,
//       source: {
//         branch: 'main',
//         path: '/'
//       }
//     });
//     console.log(`✅ GitHub Pages enabled`);
//   } catch (error) {
//     if (error.status === 409) {
//       console.log(`ℹ️  GitHub Pages already enabled`);
//     } else {
//       console.error('Failed to enable GitHub Pages:', error.message);
//     }
//   }
// }

// // Notify evaluation endpoint with retry
// async function notifyEvaluationEndpoint(url, data, maxRetries = 5) {
//   console.log(`\n📤 Notifying evaluation endpoint: ${url}`);

//   for (let attempt = 0; attempt < maxRetries; attempt++) {
//     try {
//       const response = await fetch(url, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify(data)
//       });

//       if (response.ok) {
//         console.log(`✅ Notification successful (attempt ${attempt + 1})`);
//         return;
//       }

//       console.log(`⚠️  Attempt ${attempt + 1} failed: ${response.status}`);
//     } catch (error) {
//       console.log(`⚠️  Attempt ${attempt + 1} error: ${error.message}`);
//     }

//     if (attempt < maxRetries - 1) {
//       const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
//       console.log(`⏳ Waiting ${delay / 1000}s before retry...`);
//       await new Promise(resolve => setTimeout(resolve, delay));
//     }
//   }

//   throw new Error('Failed to notify evaluation endpoint after all retries');
// }

// // Utility functions
// function sanitizeRepoName(taskName) {
//   return taskName
//     .toLowerCase()
//     .replace(/[^a-z0-9-]/g, '-')
//     .replace(/-+/g, '-')
//     .replace(/^-|-$/g, '');
// }

// function getMITLicense() {
//   const year = new Date().getFullYear();
//   return `MIT License

// Copyright (c) ${year} ${GITHUB_USERNAME}

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.`;
// }

// // Start server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`\n🚀 Server running on port ${PORT}`);
//   console.log(`📍 Endpoint: http://localhost:${PORT}/api/deploy`);
//   console.log(`💚 Health check: http://localhost:${PORT}/health`);
// });


import express from "express";

const app = express();
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  console.log("Health check requested");
  res.status(200).send("OK");
});

// Test endpoint to simulate processing requests
app.post("/generate", (req, res) => {
  console.log("Received app generation request:", req.body);
  // Simulate async processing
  setTimeout(() => {
    console.log("Processing complete for request:", req.body.appName || "Unnamed App");
  }, 2000);
  res.status(200).json({ message: "Request received successfully", status: "processing" });
});

// Default root endpoint
app.get("/", (req, res) => {
  res.send("🚀 LLM Code Deployment Server is running successfully!");
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});





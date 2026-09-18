const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB Connection with better error handling
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/studybuddy';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
})
.catch((error) => {
  console.log('❌ MongoDB connection error:', error.message);
});

// Simple Gemini AI Simulation (replace with real API when you have the key)
class AIService {
  static async generateSummary(text) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simple summary simulation
    const sentences = text.split('.').filter(s => s.trim().length > 0);
    const summary = sentences.slice(0, 3).join('. ') + '.';
    
    return summary || "Summary generated successfully. This is a simulated response since no Gemini API key was provided.";
  }

  static async generateMCQs(text, subject, count = 5) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate MCQ generation
    const questions = [
      {
        question: `What is the main concept in ${subject}?`,
        options: ['Concept A', 'Concept B', 'Concept C', 'Concept D'],
        correctAnswer: 0,
        explanation: 'This is the fundamental concept that forms the basis of the subject.'
      },
      {
        question: `Which principle is most important in ${subject}?`,
        options: ['Principle X', 'Principle Y', 'Principle Z', 'Principle W'],
        correctAnswer: 1,
        explanation: 'This principle governs the core mechanisms of the subject.'
      }
    ].slice(0, count);

    return { questions };
  }

  static async generateStudyPlan(subjects, hoursPerDay, days = 7) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate study plan generation
    const studyPlan = {
      days: []
    };

    for (let i = 0; i < days; i++) {
      const day = {
        day: `Day ${i + 1}`,
        sessions: [
          {
            time: '9:00 - 10:30',
            subject: subjects[0] || 'Physics',
            topic: 'Core Concepts'
          },
          {
            time: '11:00 - 12:30',
            subject: subjects[1] || 'Mathematics',
            topic: 'Practice Problems'
          }
        ]
      };
      studyPlan.days.push(day);
    }

    return studyPlan;
  }
}

// MongoDB Schemas
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  subjects: [String],
  studyPreferences: {
    dailyGoal: { type: Number, default: 4 },
    preferredSubjects: [String],
    studyTimes: [String]
  },
  createdAt: { type: Date, default: Date.now }
});

const StudySessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: String,
  duration: Number,
  date: { type: Date, default: Date.now },
  notes: String
});

const NoteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: String,
  originalContent: String,
  summary: String,
  fileUrl: String,
  createdAt: { type: Date, default: Date.now }
});

const MCQSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: String,
  questions: [{
    question: String,
    options: [String],
    correctAnswer: Number,
    explanation: String
  }],
  createdAt: { type: Date, default: Date.now }
});

const CommunityPostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: String,
  subject: String,
  replies: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const StudyPartnerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjects: [String],
  availability: [String],
  bio: String,
  isAvailable: { type: Boolean, default: true }
});

const StudyMaterialSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: String,
  description: String,
  subject: String,
  fileUrl: String,
  fileType: String,
  downloads: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Models = {
  User: mongoose.model('User', UserSchema),
  StudySession: mongoose.model('StudySession', StudySessionSchema),
  Note: mongoose.model('Note', NoteSchema),
  MCQ: mongoose.model('MCQ', MCQSchema),
  CommunityPost: mongoose.model('CommunityPost', CommunityPostSchema),
  StudyPartner: mongoose.model('StudyPartner', StudyPartnerSchema),
  StudyMaterial: mongoose.model('StudyMaterial', StudyMaterialSchema)
};

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'studybuddy-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// File Upload Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Routes

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Study Buddy API is working!', timestamp: new Date() });
});

// Auth Routes
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await Models.User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const user = new Models.User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'studybuddy-secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await Models.User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'studybuddy-secret',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// Notes Summarizer
app.post('/api/summarize', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    let text = 'Sample text for demonstration. This would be extracted from the uploaded file in a real implementation.';

    if (req.file) {
      text = `Content from file: ${req.file.originalname}. File processing would happen here with real implementation.`;
    } else if (req.body.text) {
      text = req.body.text;
    }

    const summary = await AIService.generateSummary(text);

    // Save to database
    const note = new Models.Note({
      userId: req.user.userId,
      title: req.file ? req.file.originalname : 'Manual Note',
      originalContent: text,
      summary: summary,
      fileUrl: req.file ? `/uploads/${req.file.filename}` : null
    });

    await note.save();

    res.json({ summary, noteId: note._id });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({ message: 'Error summarizing notes', error: error.message });
  }
});

// MCQ Generator
app.post('/api/generate-mcqs', authenticateToken, async (req, res) => {
  try {
    const { subject, topic, count = 5 } = req.body;
    
    const mcqs = await AIService.generateMCQs(topic, subject, count);

    // Save to database
    const mcqSet = new Models.MCQ({
      userId: req.user.userId,
      subject,
      questions: mcqs.questions
    });

    await mcqSet.save();

    res.json({ mcqs: mcqSet.questions, setId: mcqSet._id });
  } catch (error) {
    console.error('MCQ generation error:', error);
    res.status(500).json({ message: 'Error generating MCQs', error: error.message });
  }
});

// Study Planner
app.post('/api/generate-study-plan', authenticateToken, async (req, res) => {
  try {
    const { subjects, hoursPerDay, days } = req.body;
    
    const studyPlan = await AIService.generateStudyPlan(subjects, hoursPerDay, days);
    res.json({ studyPlan });
  } catch (error) {
    console.error('Study plan error:', error);
    res.status(500).json({ message: 'Error generating study plan', error: error.message });
  }
});

// Community Posts
app.get('/api/community/posts', authenticateToken, async (req, res) => {
  try {
    const posts = await Models.CommunityPost.find()
      .populate('userId', 'name')
      .populate('replies.userId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json({ posts });
  } catch (error) {
    console.error('Community posts error:', error);
    res.status(500).json({ message: 'Error fetching posts', error: error.message });
  }
});

app.post('/api/community/posts', authenticateToken, async (req, res) => {
  try {
    const { content, subject } = req.body;
    
    const post = new Models.CommunityPost({
      userId: req.user.userId,
      content,
      subject: subject || 'General'
    });

    await post.save();
    await post.populate('userId', 'name');

    res.json({ post, message: 'Post created successfully' });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Error creating post', error: error.message });
  }
});

// Study Partners
app.get('/api/study-partners', authenticateToken, async (req, res) => {
  try {
    const { subject } = req.query;
    
    let query = { isAvailable: true, userId: { $ne: req.user.userId } };
    if (subject) {
      query.subjects = subject;
    }

    const partners = await Models.StudyPartner.find(query)
      .populate('userId', 'name email')
      .limit(10);
    
    res.json({ partners });
  } catch (error) {
    console.error('Study partners error:', error);
    res.status(500).json({ message: 'Error fetching study partners', error: error.message });
  }
});

// Study Materials
app.get('/api/study-materials', authenticateToken, async (req, res) => {
  try {
    const { subject } = req.query;
    
    let query = {};
    if (subject) {
      query.subject = subject;
    }

    const materials = await Models.StudyMaterial.find(query)
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json({ materials });
  } catch (error) {
    console.error('Study materials error:', error);
    res.status(500).json({ message: 'Error fetching study materials', error: error.message });
  }
});

// Progress Dashboard
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Sample data for demonstration
    const weeklyStats = {
      totalStudyTime: 272, // 4h 32m in minutes
      sessionsCount: 8,
      subjectsStudied: 3,
      goalCompletion: 87
    };

    const recentActivity = {
      notes: [],
      mcqs: []
    };

    res.json({
      weeklyStats,
      recentActivity
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Error fetching dashboard stats', error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Study Buddy server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base: http://localhost:${PORT}/api`);
});
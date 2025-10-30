import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, UploadCloud, FileText, Loader2, HelpCircle, FileDown, FileSearch, Trash2, Moon, Sun, ListChecks, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

// --- Helper Components & Styles for Neumorphic/Glassmorphic look with Glows ---

// A common container style for the main cards
// Fixed: Converted from motion.div.attrs (styled-components syntax) to a standard React component
// This resolves the "motion.div.attrs is not a function" TypeError
const CardContainer = ({ children, className, ...rest }) => (
  <motion.div
    {...rest} // Pass down framer-motion props (initial, animate, transition, etc.)
    className={`rounded-2xl p-6 sm:p-8 shadow-lg relative overflow-hidden ${className || ''}`}
    style={{
      background: 'linear-gradient(145deg, rgba(22, 27, 34, 0.8), rgba(28, 33, 40, 0.8))',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)', // For Safari compatibility
      border: '1px solid rgba(40, 48, 60, 0.6)',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)' // Inner light for neumorphism
    }}
  >
    {children}
  </motion.div>
);


// Input Field with Futuristic Styling and Glow on Focus
// Fixed: Converted from motion.input.attrs (styled-components syntax) to a standard React component
// This also resolves the "motion.div.attrs is not a function" (as it applied to motion.input too)
// Merged backtick styles into Tailwind classes and inline styles
const FuturisticInput = (props) => (
  <motion.input
    {...props} // Pass through props like value, onChange, placeholder
    className={`flex-grow rounded-lg border px-4 py-3 text-sm placeholder-gray-500 
                focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40 
                transition-all duration-300 ${props.className || ''}`}
    style={{
      background: 'rgba(13, 17, 23, 0.7)',
      borderColor: 'rgba(40, 48, 60, 0.8)',
      color: '#E2E8F0',
    }}
  />
);


// Glowing Button Component
const GlowingButton = ({ children, onClick, disabled, isLoading, className = "", color = "green", ...props }) => {
  const baseClasses = "w-full inline-flex items-center justify-center rounded-lg py-3 px-4 text-sm font-semibold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden";
  
  let colorClasses = "";
  let shadowClasses = "";
  switch (color) {
    case "blue":
      colorClasses = "bg-blue-600 hover:bg-blue-500";
      shadowClasses = "shadow-blue-600/30 hover:shadow-blue-500/40";
      break;
    case "purple":
      colorClasses = "bg-purple-600 hover:bg-purple-500";
      shadowClasses = "shadow-purple-600/30 hover:shadow-purple-500/40";
      break;
    case "teal": // New color for MCQs
      colorClasses = "bg-teal-600 hover:bg-teal-500";
      shadowClasses = "shadow-teal-600/30 hover:shadow-teal-500/40";
      break;
    default: // green
      colorClasses = "bg-green-600 hover:bg-green-500";
      shadowClasses = "shadow-green-600/30 hover:shadow-green-500/40";
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98, y: 0 }}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${colorClasses} shadow-lg ${shadowClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-white" />
      ) : (
        <>
          {children}
          {/* Subtle glow effect */}
          <span className={`absolute inset-0 bg-gradient-to-r ${color === "blue" ? "from-blue-400/0 via-blue-400/50 to-blue-400/0" : color === "purple" ? "from-purple-400/0 via-purple-400/50 to-purple-400/0" : color === "teal" ? "from-teal-400/0 via-teal-400/50 to-teal-400/0" : "from-green-400/0 via-green-400/50 to-green-400/0"} opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse-light`} />
        </>
      )}
    </motion.button>
  );
};

const GlowText = ({ children, className = "" }) => (
  <span className={`text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 ${className}`}>
    {children}
  </span>
);

const ResultBox = ({ title, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
    className="mt-6 rounded-lg border border-gray-700 bg-[#0D1117] p-4 text-gray-300"
  >
    <h3 className="text-lg font-semibold text-green-300 mb-2">{title}</h3>
    <p className="whitespace-pre-wrap text-sm">{children}</p>
  </motion.div>
);

// --- Main App Component ---

export default function DocumentSummarizerApp() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
  const [sessionId, setSessionId] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);
  const [userQuestion, setUserQuestion] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);
  const [answer, setAnswer] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode

  // --- New state for MCQs ---
  const [mcqs, setMcqs] = useState([]);
  const [isGeneratingMcqs, setIsGeneratingMcqs] = useState(false);
  const [showMcqs, setShowMcqs] = useState(false);

  // --- Dropzone setup ---
  const onDrop = useCallback((acceptedFiles) => {
    setUploadedFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
    setIsProcessed(false); 
    setAnswer("");
    setSummary("");
    setError(null);
    // Reset MCQs when new files are added
    setMcqs([]);
    setShowMcqs(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'] } });

  // --- Event Handlers (Simulated) ---
  const handleRemoveFile = (fileName) => {
    setUploadedFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));
    if (uploadedFiles.length - 1 === 0) {
      setIsProcessed(false);
      setAnswer("");
      setSummary("");
      // Reset MCQs when last file is removed
      setMcqs([]);
      setShowMcqs(false);
    }
  };

  const handleProcessDocuments = async () => {
  if (uploadedFiles.length === 0) {
    setError("Please upload at least one PDF file.");
    return;
  }
  setError(null);
  setIsProcessing(true);

  const formData = new FormData();
    uploadedFiles.forEach(file => formData.append("files", file));

    try {
      const res = await fetch(`${BACKEND_URL}/process`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setSessionId(data.session_id); // backend returns this
      setIsProcessed(true);
    } catch (err) {
      console.error(err);
      setError("Failed to process documents");
    } finally {
      setIsProcessing(false);
    }
  };


  const handleAskQuestion = async () => {
    if (!userQuestion) return;
    if (!sessionId) {
      setError("Please process a document first.");
      return;
    }

    setIsAnswering(true);
    setAnswer("");

    try {
      const formData = new FormData();
      formData.append("session_id", sessionId);
      formData.append("question", userQuestion);

      const response = await fetch("http://localhost:8000/chat/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to fetch answer");

      const data = await response.json();
      setAnswer(data.answer || "No response from model.");
    } catch (error) {
      console.error(error);
      setError("Error fetching answer. Please check backend connection.");
    } finally {
      setIsAnswering(false);
    }
  };


  const handleSummarize = async () => {
    if (!sessionId) {
      setError("Please process a document first.");
      return;
    }

    setIsSummarizing(true);
    setSummary("");

    try {
      const response = await fetch(`${BACKEND_URL}/summary/${sessionId}`);

      if (!response.ok) throw new Error("Failed to fetch summary");

      const data = await response.json();
      setSummary(data.summary || "No summary available.");
    } catch (error) {
      console.error(error);
      setError("Error generating summary.");
    } finally {
      setIsSummarizing(false);
    }
  };


  const parseMcqsFromText = (text) => {
    const blocks = text.split(/\n\s*\n/).filter(Boolean);
    return blocks.map((block, index) => {
      const [questionLine, ...optionsAndAnswer] = block.split("\n").filter(Boolean);
      const options = optionsAndAnswer.filter(line => /^[A-D]\./.test(line));
      const answerLine = optionsAndAnswer.find(line => /correct|answer|✓/i.test(line)) || "";
      const answer = answerLine.replace(/.*:/, "").trim();
      return { question: questionLine, options, answer };
    });
  };


  // --- New handler for MCQs ---
  const handleGenerateMcqs = async () => {
    if (!sessionId) {
      setError("Please process a document first to get a session ID.");
      return;
    }

    setIsGeneratingMcqs(true);
    setMcqs([]);
    setShowMcqs(true);

    try {
      const response = await fetch(`http://localhost:8000/mcqs/${sessionId}`);
      if (!response.ok) throw new Error("Failed to fetch MCQs");

      const data = await response.json();
      console.log("MCQ data:", data); // ✅ Debug line

      // The backend already returns structured MCQs (list of {question, options, answer})
      if (Array.isArray(data.mcqs)) {
        setMcqs(data.mcqs);
      } else {
        // fallback in case it's a text string
        const parsedMcqs = parseMcqsFromText(data.mcqs || "");
        setMcqs(parsedMcqs);
      }

    } catch (error) {
      console.error(error);
      setError("Error generating MCQs.");
    } finally {
      setIsGeneratingMcqs(false);
    }
  };



  return (
    <div className={`relative min-h-screen ${darkMode ? 'bg-[#0D1117] text-gray-200' : 'bg-gray-100 text-gray-800'} overflow-hidden font-sans p-4 sm:p-6 lg:p-8`}>
      {/* Global CSS for subtle animations */}
      <style>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
          100% { background-position: 0% 0%; }
        }
        @keyframes pulse-light {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-pulse-light {
          animation: pulse-light 1.5s infinite ease-in-out;
        }
        /* Custom scrollbar for MCQ panel */
        .mcq-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .mcq-scrollbar::-webkit-scrollbar-track {
          background: rgba(13, 17, 23, 0.5);
          border-radius: 4px;
        }
        .mcq-scrollbar::-webkit-scrollbar-thumb {
          background-color: #3b82f6; /* Blue */
          border-radius: 4px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .mcq-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #2563eb; /* Darker Blue */
        }
      `}</style>

      {/* Animated Background */}
      <div
        className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage: 'linear-gradient(135deg, #a78bfa 0%, #3b82f6 25%, #8b5cf6 50%, #d946ef 75%, #a78bfa 100%)',
          backgroundSize: '200% 200%',
          animation: 'gradient-shift 30s ease infinite',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* --- Top Navbar --- */}
        <motion.nav
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={`${darkMode ? 'bg-[#161B22]/80 border-gray-700' : 'bg-white/80 border-gray-200'} backdrop-blur-sm rounded-xl px-6 py-4 mb-8 flex justify-between items-center border shadow-lg`}
        >
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            <GlowText>AI Document Summarizer & Q&A</GlowText>
          </h1>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 text-yellow-300 hover:text-yellow-400' : 'bg-gray-200 text-blue-600 hover:text-blue-700'} transition-colors duration-300`}
          >
            {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </motion.button>
        </motion.nav>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* --- Left Panel --- */}
          <motion.aside
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-1 space-y-6"
          >
            <CardContainer className={`${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              {/* Cartoon-style AI Brain Logo */}
              <motion.div
                animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 0.95, 1] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="relative w-24 h-24 mx-auto mb-6"
              >
                <BrainCircuit className="w-full h-full text-blue-500" style={{ filter: 'drop-shadow(0 0 8px #3B82F6)' }} />
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-gray-100 opacity-80" style={{ textShadow: '0 0 5px rgba(255,255,255,0.5)' }}>AI</span>
              </motion.div>

              <h2 className={`text-xl font-bold text-center mt-4 flex items-center justify-center gap-2 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                <FileSearch className="text-gray-400" />
                Document Processor
              </h2>
              <p className={`text-sm text-center mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Upload your files here and click 'Process' to get started.
              </p>

              {/* File Uploader (with Glowing Borders) */}
              <motion.div
                {...getRootProps()}
                className={`mt-6 block w-full cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors relative group ${
                  isDragActive
                    ? 'border-blue-500 bg-[#1c2a4a] text-blue-200'
                    : `${darkMode ? 'border-gray-700 bg-[#0D1117] hover:border-blue-500' : 'border-gray-300 bg-gray-50 hover:border-blue-300'}`
                }`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <input {...getInputProps()} />
                <UploadCloud className={`w-12 h-12 mx-auto transition-colors ${isDragActive ? 'text-blue-400' : (darkMode ? 'text-gray-500 group-hover:text-blue-400' : 'text-gray-400 group-hover:text-blue-500')}`} />
                <p className={`mt-3 block text-base font-semibold ${isDragActive ? 'text-blue-200' : (darkMode ? 'text-gray-300 group-hover:text-blue-200' : 'text-gray-700 group-hover:text-blue-600')}`}>
                  {isDragActive ? "Drop the files here..." : "Upload PDF Files"}
                </p>
                {uploadedFiles.length > 0 && (
                  <p className={`mt-1 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>{uploadedFiles.length} file(s) selected</p>
                )}
                {/* Glowing border effect */}
                <div className={`absolute inset-0 rounded-lg pointer-events-none transition-opacity duration-300 ${isDragActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`} style={{
                  background: 'linear-gradient(45deg, #3b82f6, #8b5cf6, #d946ef)',
                  filter: 'blur(8px)',
                  zIndex: -1,
                }} />
              </motion.div>

              {/* List of uploaded files */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                  <h4 className={`font-semibold text-xs uppercase ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>Files:</h4>
                  <AnimatePresence>
                    {uploadedFiles.map(file => (
                      <motion.div
                        key={file.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className={`flex items-center justify-between gap-2 text-sm p-2 rounded-md border ${darkMode ? 'bg-[#0D1117] border-gray-700 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-700'}`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                          <span className="truncate" title={file.name}>{file.name}</span>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleRemoveFile(file.name)}
                          className={`${darkMode ? 'text-gray-500 hover:text-red-400' : 'text-gray-500 hover:text-red-600'} p-1 rounded-full ${darkMode ? 'hover:bg-red-900/30' : 'hover:bg-red-100'} transition-colors`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Process Documents Button */}
              <div className="mt-6">
                <GlowingButton
                  onClick={handleProcessDocuments}
                  isLoading={isProcessing}
                  disabled={uploadedFiles.length === 0}
                  className="group" // Add group for hover glow
                >
                  Process Documents
                </GlowingButton>
              </div>
              
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 text-sm text-red-400 text-center"
                >
                  {error}
                </motion.p>
              )}
            </CardContainer>
          </motion.aside>

          {/* --- Main Content Area --- */}
          <main className="lg:col-span-3 space-y-8">
            {/* This card was removed to match the new prompt's structure, but the nav-bar provides the title */}
            {/* The prompt implies the Q&A and Summary are the main content, not inside a separate title card */}

            <AnimatePresence mode="wait">
              {!isProcessed ? (
                <CardContainer 
                  key="info"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className={`${darkMode ? 'border-blue-700 bg-blue-900/40 text-blue-200' : 'border-blue-300 bg-blue-100 text-blue-800'}`}
                >
                  <p className="text-center">Please upload and process your PDF documents using the sidebar to enable Q&A and Summarization.</p>
                </CardContainer>
              ) : (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-8"
                >
                  {/* --- Q&A Section --- */}
                  <CardContainer
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
                  >
                    <h2 className={`text-2xl font-bold flex items-center gap-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                      <HelpCircle className="text-blue-500" />
                      Ask a Question
                    </h2>
                    <div className="mt-4 flex flex-col sm:flex-row gap-4">
                      <FuturisticInput
                        type="text"
                        value={userQuestion}
                        onChange={(e) => setUserQuestion(e.target.value)}
                        placeholder="Enter your question here..."
                      />
                      <GlowingButton
                        color="blue"
                        onClick={handleAskQuestion}
                        disabled={!userQuestion || isAnswering}
                        className="sm:w-auto sm:px-8" // Make button shrink on larger screens
                      >
                        {isAnswering ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          "Ask"
                        )}
                      </GlowingButton>
                    </div>
                    
                    <AnimatePresence>
                      {answer && (
                        <ResultBox title="Answer:">
                          {answer}
                        </ResultBox>
                      )}
                    </AnimatePresence>
                  </CardContainer>

                  {/* --- Generation Section (Buttons) --- */}
                  <CardContainer
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
                  >
                    <h2 className={`text-2xl font-bold flex items-center gap-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                      <FileDown className="text-purple-500" />
                      Generate Content
                    </h2>
                    <p className={`text-sm mt-2 mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Generate a summary or multiple-choice questions from your documents.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <GlowingButton
                        color="purple" // Distinct color for summarize
                        onClick={handleSummarize}
                        isLoading={isSummarizing}
                      >
                        <FileDown className="w-5 h-5 mr-2" />
                        Generate Summary
                      </GlowingButton>
                      <GlowingButton
                        color="teal" // New color for MCQs
                        onClick={handleGenerateMcqs}
                        isLoading={isGeneratingMcqs}
                      >
                        <ListChecks className="w-5 h-5 mr-2" />
                        Generate MCQs
                      </GlowingButton>
                    </div>

                    <AnimatePresence>
                      {summary && (
                        <ResultBox title="Summary:">
                          {summary}
                        </ResultBox>
                      )}
                    </AnimatePresence>
                  </CardContainer>
                </motion.div>
              )}
            </AnimatePresence>
          </main>

        </div>
      </div>

      {/* --- New MCQ Slide-in Panel --- */}
      <AnimatePresence>
        {showMcqs && (
          <motion.div
            key="mcq-panel"
            className={`fixed top-0 right-0 h-full w-full max-w-lg z-50 ${darkMode ? 'bg-[#161B22]/90 border-l border-gray-700' : 'bg-white/90 border-l border-gray-200'} backdrop-blur-md shadow-2xl`}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="h-full flex flex-col">
              {/* Panel Header */}
              <div className={`flex items-center justify-between p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h2 className={`text-2xl font-bold flex items-center gap-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  <ListChecks className="text-teal-500" />
                  Generated MCQs
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowMcqs(false)}
                  className={`p-2 rounded-full ${darkMode ? 'text-gray-500 hover:bg-gray-700 hover:text-gray-300' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'} transition-colors`}
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>

              {/* Panel Content (Scrollable) */}
              <div className="flex-grow overflow-y-auto p-6 mcq-scrollbar">
                {isGeneratingMcqs ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className={`w-12 h-12 animate-spin ${darkMode ? 'text-teal-400' : 'text-teal-600'}`} />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {mcqs.map((mcq, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-lg border ${darkMode ? 'bg-[#0D1117] border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                      >
                        <p className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {mcq.question.replace(/^\d+[\.\)]\s*/, '')}
                        </p>
                        <div className="mt-3 space-y-2">
                          {mcq.options.map((option, i) => {
                            const correctLetterMatch = mcq.answer.match(/([A-D])\)/i);
                            const correctLetter = correctLetterMatch ? correctLetterMatch[1].toUpperCase() : "";
                            const optionLetter = option.trim().charAt(0).toUpperCase();
                            const isCorrect = optionLetter === correctLetter;

                            return (
                              <div
                                key={i}
                                className={`
                                  p-3 rounded-md text-sm border transition-all duration-200
                                  ${darkMode ? 'border-gray-700 text-gray-300' : 'border-gray-300 text-gray-700'}
                                  ${isCorrect 
                                    ? `border-green-500 ring-2 ring-green-500/50 ${darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'} shadow-[0_0_15px_rgba(74,222,128,0.3)]` 
                                    : (darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100')
                                  }
                                `}
                              >
                                {option}
                              </div>
                            );
                          })}

                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}


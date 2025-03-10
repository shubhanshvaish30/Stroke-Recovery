import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaArrowLeft, FaPaperPlane, FaMicrophone, FaVolumeUp, FaVolumeMute } from 'react-icons/fa'
import {io} from 'socket.io-client'

const socket = io("http://localhost:8080", {
  withCredentials: true,
  transports: ["websocket", "polling"], 
  reconnection: true,  
  reconnectionAttempts: 10, 
  reconnectionDelay: 5000, 
});


const AITherapy = () => {
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      sender: 'ai', 
      text: "Hello! I'm Dr. Ira, your AI therapy assistant. How are you feeling today?",
      timestamp: new Date().toISOString()
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef(null)
  const recognitionRef = useRef(null)
  const speechSynthesisRef = useRef(window.speechSynthesis)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const enableSpeech = () => {
        if (!speechSynthesisRef.current) return;
        console.log("Speech Synthesis Enabled");
        window.removeEventListener("click", enableSpeech);
    };

    window.addEventListener("click", enableSpeech);
    return () => window.removeEventListener("click", enableSpeech);
}, []);

  useEffect(() => {
    socket.on("connect", () => console.log("Connected to server"));

    socket.on("bot_reply", (data) => {
      let formattedReply = data.reply
      .replace(/#\s*(.*?)\n/g, "") 
      .replace(/\*\*(.*?)\*\*/g, "$1")  // Convert **bold** to <strong>bold</strong>
      .replace(/\*(.*?)\*/g, "")  // Convert *bullets* to <br> • bullet
      .replace(/\s+/g, " ")// Convert "text" to proper quotes

        setMessages(prev => [...prev, { 
            id: prev.length + 1, 
            sender: "ai", 
            text: formattedReply, 
            timestamp: new Date().toISOString() 
        }]);
        setIsTyping(false);
        if (isSpeaking) {
          speechSynthesisRef.current.cancel();
          speakText(data.reply);
        }
    });

    return () => {
      socket.off("bot_reply");
      socket.off("connect");
      socket.off("disconnect");

      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
  };  
}, [isSpeaking]);
  
  const handleSendMessage = () => {
    if (input.trim() === '') return
    
    const userMessage = {
      id: messages.length + 1,
      sender: 'user',
      text: input,
      timestamp: new Date().toISOString()
    }
    
    setMessages([...messages, userMessage])
    setInput('')
    setIsTyping(true)
    
    socket.emit('user_message', { text: userMessage.text })
  }
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage()
    }
  }
  
  const toggleSpeech = () => {
    setIsSpeaking(!isSpeaking)
  }

  const speakText = (text) => {
    if (!speechSynthesisRef.current) return;

    speechSynthesisRef.current.cancel(); // Stop any previous speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    const voices = window.speechSynthesis.getVoices();

    const femaleVoice = voices.find(voice => voice.name.includes("Female") || voice.name.includes("Zira") || voice.name.includes("Google UK English Female"));

    if (femaleVoice) {
        utterance.voice = femaleVoice;
    }

    utterance.onstart = () => {
        console.log("Speaking...");
    };

    utterance.onend = () => {
        console.log("Speech finished.");
    };

    speechSynthesisRef.current.speak(utterance);
};

  
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser.")
      return
    }

    const recognition = new window.webkitSpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      handleSendMessage(transcript)
    }

    recognition.onerror = (event) => console.error("Speech recognition error:", event)

    recognition.onend = () => setIsListening(false)

    recognition.start()
    recognitionRef.current = recognition
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div 
        className="fixed inset-0 bg-cover bg-center z-0" 
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1974&q=80')`, filter: 'brightness(0.8)' }}
      ></div>
      
      <header className="bg-white bg-opacity-90 shadow-md py-4 px-6 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/dashboard" className="mr-4 text-gray-600 hover:text-gray-800">
              <FaArrowLeft />
            </Link>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                <span className="text-primary-600 font-bold">AI</span>
              </div>
              <div>
                <h1 className="font-bold text-gray-800">Dr. Ira</h1>
                <p className="text-sm text-gray-500">AI Therapy Assistant</p>
              </div>
            </div>
          </div>
          <button 
            onClick={toggleSpeech}
            className={`p-2 rounded-full ${isSpeaking ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'}`}
          >
            {isSpeaking ? <FaVolumeUp /> : <FaVolumeMute />}
          </button>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 z-10">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-4 pb-20">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs md:max-w-md rounded-lg p-4 ${
                  message.sender === 'user' 
                    ? 'bg-primary-600 text-white rounded-br-none' 
                    : 'bg-white text-gray-800 rounded-bl-none'
                }`}>
                  <p>{message.text}</p>
                  <p className={`text-xs mt-1 text-right ${
                    message.sender === 'user' ? 'text-primary-100' : 'text-gray-500'
                  }`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </motion.div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 rounded-lg rounded-bl-none p-4">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
      
      <div className="bg-white bg-opacity-90 p-4 shadow-md z-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">
            <button 
              onClick={isListening ? stopListening : startListening} 
              className={`text-gray-500 hover:text-gray-700 mr-2 ${isListening ? 'text-red-500' : ''}`}
            >
              <FaMicrophone />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 bg-transparent border-none focus:outline-none py-2"
            />
            <button 
              onClick={handleSendMessage}
              disabled={input.trim() === ''}
              className={`ml-2 p-2 rounded-full ${
                input.trim() === '' 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              <FaPaperPlane />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AITherapy

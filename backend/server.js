const express = require('express')
const cors = require('cors')
const Groq = require('groq-sdk')
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.json())

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body
    const formattedMessages = [
      {
        role: 'system',
        content: 'You are BeaconAI, an extremely intelligent and helpful AI assistant like Claude. Give detailed, well-structured answers with examples. Be warm and friendly. Today is ' + new Date().toDateString()
      },
      ...messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }))
    ]
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: formattedMessages,
      max_tokens: 8192,
      temperature: 0.7
    })
    const reply = response.choices[0].message.content
    console.log('Reply sent!')
    res.json({ reply })
  } catch (error) {
    console.error('Groq error:', error.message)
    res.status(500).json({ reply: 'Sorry, I had trouble responding. Please try again!' })
  }
})

app.get('/', (req, res) => {
  res.json({ status: 'BeaconAI backend is running!' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log('BeaconAI backend running on port ' + PORT)
})
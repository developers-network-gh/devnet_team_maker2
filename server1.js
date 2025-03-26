const express = require('express')
require('dotenv').config()
const app = express()
const PORT = process.env.PORT || 3000
const fs = require('fs')
const path = require('path')

app.set('view engine', 'ejs')
app.use(express.urlencoded({ extended: true }))

let participants = []
let teams = []
let error_message = ""

try {
  participants = JSON.parse(fs.readFileSync('participants.json', 'utf-8'))
} catch {}

try {
  teams = JSON.parse(fs.readFileSync('teams.json', 'utf-8'))
} catch {}

app.get('/', (req, res) => {
  res.render('index1', { participants, error_message, teams })
  error_message = ''
})

app.post('/add_participant', (req, res) => {
  const { sid, first_name, last_name, year } = req.body
  if (!sid || !first_name || !last_name || !year) {
    error_message = 'All fields required'
    return res.redirect('/')
  }
  if (parseInt(year) < 1) {
    error_message = 'Invalid year'
    return res.redirect('/')
  }
  const exists = participants.some(
    p => p.sid === sid
  )
  if (exists) {
    error_message = 'Participant already exists'
    return res.redirect('/')
  }
  const participant = {
    sid: sid,
    first_name: first_name,
    last_name: last_name,
    year: parseInt(year)
  }
  participants.push(participant)
  write_participants(participants)

  res.redirect('/')
})

app.post('/delete_participant', (req, res) => {
  const { sid, first_name, last_name, year } = req.body
  const participant = {
    sid: sid,
    first_name: first_name,
    last_name: last_name,
    year: parseInt(year)
  }
  if (!sid || !first_name || !last_name || !year) {
    error_message = 'All fields required'
    return res.redirect('/')
  }
  const index = participants.findIndex(p =>
    p.sid === sid &&
    p.first_name === first_name &&
    p.last_name === last_name &&
    p.year === parseInt(year)
  )

  if (index !== -1) {
    participants.splice(index, 1)
    write_participants(participants)
    return res.redirect('/')
  } else {
    error_message = 'Participant not found'
    return res.redirect('/')
  }
})

app.post('/randomize', (req, res) => {
  if (participants.length < 6) {
    error_message = 'Not enough participants'
    return res.redirect('/')
  }

  teams = formTeams(participants)
  if (!teams) {
    error_message = 'Unable to form valid teams'
    return res.redirect('/')
  }

  write_teams(teams)
  fs.writeFileSync('teams.json', JSON.stringify(teams, null, 2))

  res.redirect('/')
})

app.post('/clear', (req, res) => {
  const { password } = req.body
  const CLEAR_PASSWORD = 'DevnetRules!'

  if (password !== CLEAR_PASSWORD) {
    error_message = 'Wrong password'
    return res.redirect('/')
  }

  participants = []
  teams = []

  fs.writeFileSync('participants.json', JSON.stringify(participants))
  fs.writeFileSync('teams.json', JSON.stringify(teams))

  res.redirect('/')
})

app.get('/download-csv', (req, res) => {
  const filePath = path.join(__dirname, 'teams.csv')
  res.download(filePath, 'teams.csv', err => {
    if (err) {
      console.error('CSV download failed:', err)
      error_message = 'CSV download failed'
      res.redirect('/')
    }
  })
})

function getScore(year) {
  if (year === 1) return 10
  if (year === 2) return 20
  if (year === 3) return 30
  return 40
}

function getTeamSizes(n) {
  if (n < 6) return null
  let result = []
  while (n > 0) {
    if (n === 6) { result.push(3, 3); break }
    else if (n === 7) { result.push(3, 4); break }
    else if (n === 8) { result.push(4, 4); break }
    else if (n === 9) { result.push(3, 3, 3); break }
    else if (n === 10) { result.push(3, 3, 4); break }
    else if (n === 11) { result.push(3, 4, 4); break }
    else if (n === 12) { result.push(4, 4, 4); break }
    else {
      if (n >= 4) { 
        result.push(4);
        n -= 4
      }
      else {
        result.push(3);
        n -= 3
      }
    }
  }
  return result
}

function formTeams(list) {
  let sizes = getTeamSizes(list.length)
  if (!sizes) return null
  let sorted = list.slice().sort((a, b) => getScore(b.year) - getScore(a.year))
  let teams = sizes.map(s => ({ size: s, members: [], sum: 0 }))
  sorted.forEach(p => {
    let best = teams.reduce((acc, t) => (t.sum < acc.sum ? t : acc))
    best.members.push(p)
    best.sum += getScore(p.year)
  })
  return teams
}


function write_teams(teams) {
  let lines = ['Team Number,First Name,Last Name']

  teams.forEach((team, i) => {
    team.members.forEach(member => {
      lines.push(`${i + 1},${member.first_name},${member.last_name}`)
    })
  })

  fs.writeFileSync('teams.csv', lines.join('\n'))
}

function write_participants(participants) {
  fs.writeFileSync('participants.json', JSON.stringify(participants, null, 2))
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

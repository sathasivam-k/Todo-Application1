const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()

app.use(express.json())

const dbPath = path.join(__dirname, 'todoApplication.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

const hasPriorityAndStatusProperty = requestQuery => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  )
}
const hasPriorityProperty = requestQuery => {
  return requestQuery.priority !== undefined
}
const hasStatusProperty = requestQuery => {
  return requestQuery.status !== undefined
}

const convertDbObjectToResponseObject = dbObject => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
  }
}

///GET todo

app.get('/todos/', async (request, response) => {
  const {search_q = '', priority, status} = request.query
  let getTodoQuery = ''
  let result = ''
  switch (true) {
    case hasPriorityAndStatusProperty(request.query):
      getTodoQuery = `
            SELECT
                *
            FROM 
                todo
            WHERE 
                todo LIKE '%${search_q}%'
                AND priority = '${priority}'     
                AND status = '${status}';`
      break
    case hasPriorityProperty(request.query):
      getTodoQuery = `
            SELECT
                *
            FROM 
                todo
            WHERE 
                todo LIKE '%${search_q}%'
                AND priority = '${priority}';`
      break
    case hasStatusProperty(request.query):
      getTodoQuery = `
            SELECT
                *
            FROM 
                todo
            WHERE 
                todo LIKE '%${search_q}%'    
                AND status = '${status}';`
      break
    default:
      getTodoQuery = `
            SELECT
                *
            FROM 
                todo
            WHERE 
                todo LIKE '%${search_q}%';`
  }
  result = await db.all(getTodoQuery)
  response.send(result.map(eachObj => convertDbObjectToResponseObject(eachObj)))
})

///GET by id

app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const getTodoByIdQuery = `
  SELECT
    *
  FROM 
    todo
  WHERE id = ${todoId};`
  const result = await db.get(getTodoByIdQuery)
  response.send(result)
})

/// POST todo

app.post('/todos/', async (request, response) => {
  const {id, todo, priority, status} = request.body
  const postTodoQuery = `
INSERT INTO 
  todo(id, todo, priority, status)
VALUES
  ( ${id}, '${todo}', '${priority}', '${status}');`
  const result = await db.run(postTodoQuery)
  response.send('Todo Successfully Added')
})

///PUT by id

app.put('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params

  let updateColumn = ''
  const requestBody = request.body

  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = 'Status'
      break
    case requestBody.priority !== undefined:
      updateColumn = 'Priority'
      break
    case requestBody.todo !== undefined:
      updateColumn = 'Todo'
      break
  }

  const getPreviousTodo = `
  SELECT
    *
  FROM 
    todo
  WHERE id = ${todoId};`
  const previousTodo = await db.get(getPreviousTodo)

  const {
    todo = previousTodo,
    priority = previousTodo,
    status = previousTodo,
  } = request.body

  const putTodoById = `
  UPDATE
    todo 
  SET
    todo = '${todo}',
    priority = '${priority}',
    status = '${status}'
  WHERE id = ${todoId};`
  await db.run(putTodoById)
  response.send(`${updateColumn} Updated`)
})

///DELETE by id

app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const deleteById = `
  DELETE FROM
    todo
  WHERE id = ${todoId};`
  await db.run(deleteById)
  response.send('Todo Deleted')
})

module.exports = app

// Require Packages
const express = require('express');
const app = express.Router();
const auth = require('basic-auth');
const bcryptjs = require('bcryptjs');
const { check, validationResult } = require('express-validator');

// Require the modules
const User = require('../models').User;
const Course = require('../models').Course;

const users = [];

// Async Error Handler
// Reference from the course videos with Treasure Porth
function asyncHandler(cb){
    return async (req,res, next) => {
        try {
            await cb(req, res, next);
        } catch(err) {
            next(err);
        }
    }
}

// Authenticator
// Reference from "Rest API authenticaton with express" Instruction section: "Creating Authenticaton Middleware"
const authenticateUser = async (req, res, next) => {
  let message = null;

  // Parse the user's credentials from the Authorization header.
  const credentials = auth(req);

  // If the user's credentials are available...
  if (credentials) {

	// Create variable to find and store all the users
	const users = await User.findAll();
    const user = users.find(u => u.emailAddress === credentials.name);

    // If a user was successfully retrieved from the data store...
    if (user) {
      const authenticated = bcryptjs
        .compareSync(credentials.pass, user.password);

      // If the passwords match...
      if (authenticated) {
        console.log(`Authentication successful for user: ${user.emailAddress}`);
        req.currentUser = user;
      } else {
        message = `Authentication failure for user: ${user.emailAddress}`;
      }
    } else {
      message = `User not found for emailAddress: ${credentials.name}`;
    }
  } else {
    message = 'Auth header not found';
  }

  // If user authentication failed...
  if (message) {
    console.warn(message);

    // Return a response with a 401 Unauthorized HTTP status code.
    res.status(401).json({ message: 'Access Denied' });
  } else {
    // Or if user authentication succeeded...
    // Call the next() method.
    next();
  }
};

// User GET request (Needs authenticator)
app.get('/api/users', authenticateUser, asyncHandler(async (req, res, next)=> {
	console.log("Get user request test");
	res.json([req.currentUser]);
}));

// User POST request 
// Code referenced from "Rest API authentication with express" Instruction, section: "Adding Validation to the User Registration Route".
app.post('/api/users', [
	check('firstName')
		.exists({ checkNull: true, checkFalsy: true })
		.withMessage('First name field is required'),
	check('lastName')
		.exists({ checkNull: true, checkFalsy: true })
		.withMessage('Last name field is required'),
	check('emailAddress')
		.exists({ checkNull: true, checkFalsy: true })
		.withMessage('Email address field is required'),
	check('password')
		.exists({ checkNull: true, checkFalsy: true })
		.withMessage('Password field is required'),
], asyncHandler(async (req, res, next) => {
	console.log("Post user request test");
	// Attempt to get the validation result from the Request object.
	const errors = validationResult(req);

	// If there are validation errors...
	if (!errors.isEmpty()) {
		// Use the Array `map()` method to get a list of error messages.
		const errorMessages = errors.array().map(error => error.msg);
		// Return the validation errors to the client.
		return res.status(400).json({ errors: errorMessages });
	}
	
	// Get the user from the request body.
	const user = req.body;
	
	// Hash the password right away
	// **I initially had the password hash statemnt in the else statment but decided otherwise since the password would still be in plain text if the given emailAddress already existed.
	user.password = bcryptjs.hashSync(user.password);
	
	// Find all of the existing users and only store the emailAddresses attribute
	const existingUsers = await User.findAll({
		attributes: ["emailAddress"]
	});
	// 
	const existingEmailAddresses = JSON.stringify(existingUsers);
	
	// Search the array for a duplicate emailAddress.
	if (existingEmailAddresses.includes(user.emailAddress)){
		// If the emailAddress already exists, display the error message.
		res.status(400).send({error: `The given email is already paired to a user.`})
	} else {
	// If the emailAddress does not already exist in the database, create the user.
	await User.create(user);
	users.push(user);
	// Location Redirect Referenced from https://www.geeksforgeeks.org/express-js-res-location-function/
	res.location('/');
	// Return the no content status code.
	return res.status(201).end();
	}
}));

// Module export.
module.exports = app;
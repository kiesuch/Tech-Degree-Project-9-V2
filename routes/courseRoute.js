// Require Packages.
const express = require('express');
const app = express.Router();
const auth = require('basic-auth');
const bcryptjs = require('bcryptjs');
const { check, validationResult } = require('express-validator');

// Require the models.
const Course = require('../models').Course;
const User = require('../models').User;

const coursesArray = [];

// Async Error Handler.
// Reference from the course videos with Treasure Porth.
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
// Reference from "Rest API authenticaton with express" Instruction section: "Creating Authenticaton Middleware".
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


// Course GET Request (All).
app.get('/api/courses', asyncHandler(async (req, res) =>{
	console.log("Get (All) courses request test");
	// Find all courses
    const courses = await Course.findAll({
		// Include the first name, last name, and email of the course owner.
		include: [{
			model: User,
			as: 'user',
			attributes: [
				'firstName',
				'lastName',
				'emailAddress'
				]
		}],
		// Exclude the createdAt and updatedAt values for 'Exceeds'
		attributes: {
			exclude: [
				'createdAt',
				'updatedAt'
			]}
	});
	// Check to see if any courses exist
	// After dealing with the update course that doesn't exist error, I decided to implement altered solutions where applicable.
	if (courses == []){
		// At least one course exists
		res.json({courses});
	} else {
		// No courses exist
		// Display error message as opposed to: "course": []"
		res.status(400).send({error: `No courses exist`});
	}
}));

// Coures GET Request (One).
app.get('/api/courses/:id', asyncHandler(async (req, res) =>{
	console.log("Get (one) course request test");
    const course = await Course.findByPk(req.params.id, {
		// Include the first name, last name, and email of the course owner.
		include: [{
			model: User,
			as: 'user',
			attributes: [
				'firstName',
				'lastName',
				'emailAddress'
				]
		}]	
	});
	// Check to see if the requested course exists.
	// Altered solution of the update non-existing course error
	if (course){
		// Course does exist
		res.json({course});
	} else {
		// Course does not exist
		// Display error message as opposed to: "course": null"
		res.status(400).send({error: `The requested course does not exist`});
	}
}));

// Course POST Request.
// Code referenced from "Rest API authentication with express" Instruction, section: "Adding Validation to the User Registration Route".
app.post('/api/courses', [
	check('title')
		.exists({ checkNull: true, checkFalsy: true })
		.withMessage('The Title field is required'),
	check('description')
		.exists({ checkNull: true, checkFalsy: true })
		.withMessage('The Description field is required'),
], authenticateUser, asyncHandler(async (req, res) => {
	console.log("Post course request test");
	const errors = validationResult(req);

	// If there are validation errors...
	if (!errors.isEmpty()) {
		const errorMessages = errors.array().map(error => error.msg);
		return res.status(400).json({ errors: errorMessages });
	}
	
	// Get the user from the request body.
	const course = req.body;
	// Create the new course.
	await Course.create(course);
	coursesArray.push(course);
	// Location Redirect Referenced from https://www.geeksforgeeks.org/express-js-res-location-function/
	res.location('/api/courses/' + course.id); 
	// Respond with the 'created' status code.
	res.status(201).end();
	
}));

// Course PUT Request (Needs Authenticator).
app.put('/api/courses/:id', authenticateUser, asyncHandler(async (req, res) => {
	console.log("Put course request test");
	// Initial testing status code
	res.sendStatus(200);
	
}))

// Course DELETE Request (Needs Authenticator).
app.delete('/api/courses/:id', authenticateUser, asyncHandler(async (req, res) => {
	console.log("Delete course request test");
	const user = req.currentUser;
	const course = await Course.findByPk(req.params.id);
	// Check to see if a course with the specified id exists
	if (course){
		// Check to see if the user owns the course
		if (user.id === course.userId){
			// User owns the course so the course will be deleted
			course.destroy();
			// Respond with the 'no content' status code.
			res.sendStatus(204).end();
		} else {
			// User is not the owner of the course so the course will not be delete
			// Respond with the 'unauthorized' status code.
			res.status(401).send({error: `You are not allowed to delete this course`});
		}
	} else {
		// Respond with the 'bad request' status code.
		res.status(400).send({error: `The requested course does not exist`});
	}
}))

// Module export.
module.exports = app;
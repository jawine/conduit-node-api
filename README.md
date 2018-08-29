## Conduit NodeJS REST API

This is a project I am using to learn about a number of topics related to server-side development. I am using this tutorial from Thinkster as a guide: (https://thinkster.io/tutorials/node-json-api).

The goal is to create a REST API backend for a Medium style blogging application called Conduit. The concepts I am focused on learning for this API are:
 - CRUD operations using HTTP GET, PUT, POST, and DELETE verbs
 - JSON as a data exchange format - data is sent and received in JSON format
 - Token-based authentication using JWT
 - Articles, comments, favorites, articles feed, and user profile functionality

The major technologies used in the project are:
 - ExpressJS for server functionality, routing, middlewares
 - PassportJS for authentication
 - jsonwebtoken and express-jwt for managing JSON web tokens
 - MongoDB as the database layer, with MongooseJS as the ORM
 - Postman for testing CRUD operations

Visual representations of the CRUD actions and URL map can be found in the api-spec directory

Update August 28, 2018:
I have completed the Thinkster tutorial for this API. Overall I was very happy with how much I learned from the guide. By the end of the first few chapters, I was feeling confident enough to write my own implementations of several of the model methods and controller/router middleware functions. I have completed several other tutorials on the subject but I felt Thinkster's guide really helped me conceptualize how all the different chunks, like models, controllers, auth framework, routing, and testing all fit in to a complete application.

Next I am planning to tackle building a front-end to consume the API. I am also interested in projects to expand on the knowledge I acquired from this tutorial, including utilizing a relational database, taking advantage of 3rd party authentication, security hardening, and deployment to production.


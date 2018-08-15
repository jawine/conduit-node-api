## Conduit NodeJS REST API

This is a project I am using to learn about a number of topics related to server-side development. I am using this tutorial from Thinkster as a guide: (https://thinkster.io/tutorials/node-json-api).

The goal is to create a REST API backend for a Medium style blogging application called Conduit. The concepts I am focused on learning for this API are:
 - CRUD operations using HTTP GET, PUT, POST, and DELETE verbs
 - JSON as a data exchange format - data is sent and received in JSON format
 - Token-based authentication using JWT
 - Articles, comments, favorites, and user profile functionality

The major technologies used in the project are:
 - ExpressJS for server functionality, routing, middlewares
 - PassportJS for authentication
 - jsonwebtoken and express-jwt for managing JSON web tokens
 - MongoDB as the database layer, with MongooseJS as the ORM
 - Postman for testing CRUD operations

Visual representations of the CRUD actions and URL map can be found in the api-spec directory
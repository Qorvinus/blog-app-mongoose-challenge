'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogData() {
  console.info('seeding blog data');
  const seedData = [];

  for (let i = 1; i <= 10; i++) {
    seedData.push(generateBlogData());
  }
  return BlogPost.insertMany(seedData);
}

function generateBlogData() {
  return {
    author: faker.name.firstName(),
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraph()
  };
}

function tearDownDb() {
  console.warn('Deleting database');
  return mongoose.connection.dropDatabase();
}

describe('Blogposts API resource', function() {

  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedBlogData();
  });

  afterEach(function() {
    return tearDownDb();
  });

  after(function() {
    return closeServer();
  });

  describe('GET endpoint', function() {

    it('should return all existing blog posts', function() {
      let res;
      return chai.request(app)
        .get('/posts')
        .then(function(_res) {
          res = _res;
          expect(res).to.have.status(200);
          expect(res.body.posts).to.have.lengthOf.at.least(1);
          return BlogPost.count();
        })
        .then(function(count) {
          expect(res.body.posts).to.have.lengthOf(count);
        });
    });

    it('should return blog posts with the correct fields', function() {
      let resBlogpost;
      return chai.request(app)
        .get('/posts')
        .then(function(res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body.posts).to.be.a('array');
          expect(res.body.posts).to.have.lengthOf.at.least(1);

          res.body.posts.forEach(function(blogpost) {
            expect(resBlogpost.id).to.equal(blogpost.id);
            expect(resBlogpost.author).to.equal(blogpost.author);
            expect(resBlogpost.title).to.equal(blogpost.title);
            expect(resBlogpost.content).to.equal(blogpost.content);
            });
          });
      });
    });

    describe('POST endpoint', function() {

      it('should add new blog post', function() {
        const newBlog = generateBlogData();

        return chai.request(app)
          .post('/posts')
          .send(newBlog)
          .then(function(res) {
            expect(res).to.have.status(201);
            expect(res).to.be.json;
            expect(res.body).to.be.a('object');
            expect(res.body).to.include.keys(
              'id', 'author', 'title', 'content');
            expect(res.body.author).to.equal(newBlog.author);
            expect(res.body.id).to.not.be.null;
            expect(res.body.title).to.equal(newBlog.title);
            expect(res.body.content).to.equal(newBlog.content);
            return Blogposts.findById(res.body.id);
            })
            .then(function(blogpost) {
              expect(blogpost.author).to.equal(newBlog.author);
              expect(blogpost.title).to.equal(newBlog.title);
              expect(blogpost.content).to.equal(newBlog.content);
            });
          });
      });

      describe('PUT endpoint', function() {
        it('should update fields you send over', function() {
          const updatedPost = {
            title: 'new title',
            content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
          };

          return Blogposts
            .findOne()
            .then(function(blogpost) {
              updatedPost.id = blogpost.id;

              return chai.request(app)
                .put(`/posts/${blogpost.id}`)
                .send(updatedPost);
            })
            .then(function(res) {
              expect(res).to.have.status(204);

              return Blogposts.findById(blogpost.id);
            })
            .then(function(blogpost) {
              expect(blogpost.title).to.equal(updatedPost.title);
              expect(blogpost.content).to.equal(updatedPost.content);
            });
        });
      });

      describe('DELETE endpoint', function() {
        it('should delete a blog post by id', function() {
          let blogpost;

          return Blogposts
            .findOne()
            .then(function(_blogpost) {
              blogpost = _blogpost;
              return chai.request(app).delete(`/posts/${blogpost.id}`);
            })
            .then(function(res) {
              expect(res).to.have.status(204);
              return Blogposts.findById(blogpost.id);
            })
            .then(function(_blogpost) {
              expect(_blogpost).to.be.null;
            });
        });
      });
});

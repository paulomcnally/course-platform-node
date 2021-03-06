const debug = require('debug')('app:controller:user:sign_up');
const randomstring = require('randomstring');
const bcrypt = require('bcryptjs');
const models = require('../../../models');

module.exports = function (router) {
  // create an user
  router.post('/', function (req, res) {
    // validate post params
    req.checkBody('sign_up_name', res.__('user.name.empty')).notEmpty();
    req.checkBody('sign_up_email', res.__('user.email.empty')).notEmpty();
    req.checkBody('sign_up_password', res.__('user.password.empty')).notEmpty();
    req.checkBody('sign_up_code', res.__('user.code.empty')).notEmpty();

    // instance validationErrors
    var validationErrors = req.validationErrors();

    if (validationErrors) {
      // show first error validation
      res.status(409).json(validationErrors.shift());
    } else {
      // check if email exists
      models.User.findOne({
        where: {
          email: req.body.sign_up_email
        }
      }).then(function(user) {
        // if exists show exists message
        if (user !== null) {
          res.status(409).json({
            error: {
              message: res.__('user.email.exists')
            }
          });
        } else {
          // validate code
          models.Code.findOne({
            where: {
              value: req.body.sign_up_code
            }
          }).then(function(code) {
            if (code === null) {
              res.status(409).json({
                error: {
                  message: res.__('user.code.does.not.exists')
                }
              });
            }
            else {
              // create encrypted password with bcrypt
              var salt = bcrypt.genSaltSync(10);
              var hash = bcrypt.hashSync(req.body.sign_up_password, salt);

              // store new user
              models.User.create({
                name: req.body.sign_up_name,
                email: req.body.sign_up_email,
                encrypted_password: hash,
                user_type: 3, // 3 = user
                reset_password_token: randomstring.generate(120),
                verification_token: randomstring.generate(120),
                active: false,
                code: code.value,
                createdAt: new Date(),
                updatedAt: new Date()
              }).then(function(user) {
                res.json({
                  id: user.id,
                  email: user.email
                });
              }).catch(function(errors) {
                // error on database validation/invalid
                var error = {
                  error: {
                    param: errors.errors[0].path,
                    message: errors.message
                  }
                };
                res.status(409).json(error);
              });
            }
          }).catch(function(errors) {
            debug(errors);
            // show error
            res.status(409).json({
              error: {
                message: res.__('generic.server.error')
              }
            });
          });
        }
      }).catch(function(errors) {
        debug(errors);
        // show error
        res.status(409).json({
          error: {
            message: res.__('generic.server.error')
          }
        });
      });
    }
  });
};

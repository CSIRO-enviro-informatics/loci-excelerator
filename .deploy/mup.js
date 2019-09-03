module.exports = {
  servers: {
    one: {
      host: '13.237.62.254',
      username: 'ec2-user',
      pem: process.env.SSH_KEY_PATH
    }
  },

  app: {
    name: 'Excelerator',
    path: '../excelerator/',

    servers: {
      one: {},
    },

    buildOptions: {
      serverOnly: true,
    },

    volumes: {
      '/opt/data/uploads': '/files',
    },

    env: {
      // TODO: Change to your app's url
      // If you are using ssl, it needs to start with https://
      ROOT_URL: 'https://excelerator.loci.cat',
      MONGO_URL: 'mongodb://localhost/meteor',
    },

    docker: {
      image: 'abernix/meteord:node-8.4.0-base',
    },

    // Show progress bar while uploading bundle to server
    // You might need to disable it on CI servers
    enableUploadProgressBar: true
  },

  mongo: {
    version: '3.4.1',
    servers: {
      one: {}
    }
  },

  // (Optional)
  // Use the proxy to setup ssl or to route requests to the correct
  // app when there are several apps

  proxy: {
    domains: 'excelerator.loci.cat',
    ssl: {
      letsEncryptEmail: 'shane.seaton@csiro.au',
      forceSSL: false
    }
  }
};

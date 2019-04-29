module.exports = {
  transcode: {
    concurrency: 2
  },
  recipes: [
    {
      src: '/Users/foobar/Movies/*.mp4',
      dest: '/Users/foobar/Desktop/encoded',
      type: 'h264'
    }
  ]
};

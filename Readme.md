## SLI Field Project

### Project Description
The SLI Field Project is a web application designed to manage and display field data. It consists of a backend server, a manual post data script, and a frontend client.

### To Convert to Localhost Version
- Check `Manual_Post/postdata.js` for port 5000.
- Check `server/index.js` for port 3000.
- Set `client/script.js` fetchLink to "http://localhost:3000/".

### Installation

1. **Backend Server**
    - Open a terminal and run the following commands:
      ```sh
      cd ./server/
      npm install
      node ./index.js
      ```

2. **Manual Post Data Script**
    - Open another terminal and run the following commands:
      ```sh
      cd ./Manual_Post/
      npm install
      node ./postdata.js
      ```

3. **Frontend Client**
    - You can either run the frontend on a live server or access it at the deployed link: [SLI Field Project Frontend](https://sli-field-project-frontend.vercel.app/)

### Usage
- The backend server runs on port 3000.
- The manual post data script runs on port 5000.
- Ensure the frontend client fetches data from the correct backend URL.

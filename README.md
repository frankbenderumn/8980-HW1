### Jericho - Distributed System Framework

This project consists of 2 custom libraries:

-prizm
-jericho

Jericho is near completion of supporting federated learning through execution of tensorflow python scripts

### Components

The main mechanisms are as follows:

- A network topology represented as a graph with support for hyper graphs in future work
- Socket requests through multiplexing
- Fetch requests through the use of pthreads and a thread pool
- Websockets
- A router interface for establishing async, http, or raw protocols
- A pub sub model with a message broker to ensure appropriate broadcasting
- Callbacks are used for reduction/parsing of message buffers
- Logging mechanisms through prizm library
- Unit testing support through prizm library

The amount of hours required to make this assignment happen was quite large and a look
at the SERVER.log file could probably verify this.

### Key Files

The key files/dirs for making distributed calls are:

- main.cc
- server/server.cc
- server/fetch.cc
- api/polygon.h
- router/*
- message/*
- cluster/*

The control of an incoming request would be as follows:
-cluster infrastructure and routes are bound in main.cc along with global scope info
-socket is generated and set to listening state in server.cc
-a request comes in in the form an http request and is sent to its corresponding route.
-if the request is bound as an http route, the file is read and served in response.cc
-if the request is bound as an api call, the bound function in polygon.h is called
-if the api call is one that requires network traversal/distribution it will call a function on the boss node in cluster_node.cc
-there are three types of fetch calls supported right now: a broadcast, single, and pulse
-single is a call to one connected node specified by host and port
-a broadcast is the set of all nodes connected to the boss
-pulse is an expansion of broadcast that will continually broadcast until the number of epochs reach zero (top of cluster_node.cc)
-a message broker is generated for all fetch requests. Separation of concerns is enforced to keep outstanding messages left to broker
-when fetch requests are made a ticketing system and queue are managed within the broker
-the ticketing system allows for async behavior and concurrent requests to the server can continue. Including ones from the same client.
-When the queue is equal to the size of the tickets, the callback is called and returns the info.
-Current example of federation only reads ping file 5 times, but the response is not returned until all epochs happen
-There is a pipe function and in polygon apiPython will pipe the tensorflow model. 
-This pipe works and with the current infrastructure, implementing federated learning would not be all that difficult.

### Federation

The main limitation I face is just understanding TensorFlows API. Everything is a little too baked in so it can be difficult 
to break it apart. I only need a small subset of the tensorflow functionality but it is not the most interoperable.
I do save out models appropriately and sending the file would be as easy as passing it as a byte string.
I just don't know how to aggregate with their current api, and partitioning the data is a bit more difficult at runtime without 
the preproccesed versions that the python lib provides.

Most of all my interaction with the system is actually done through a web interface as ajax calls.

To view the web interface you can build the project and navigate to the admin dashboard.

### Install
```
chmod -R 777 ./bin
./bin/install
./bin/compile
./bin/launch -p 8080 -t 5 -d frontend
./bin/cluster
```

I have managed to successfully build on WSL and Mac M1 and merged most of the external libraries I was using for an easy install since they were on different repos. They are private so token access is needed to retrieve them. I pushed the directory with the key.pem and cert.pem files for SSL. Not a good practice but the system wont run without them. I removed some libraries not relevant for the assignment.

### Web Interface
After launching the server got to https://localhost:8080/jericho/arthas.html

If Chrome, flags will need to allow SSL certificates on localhost, but the SSL in this assignment is from a verified certificate broker.

There is a password to login. Right now it is hardcoded. 
username: joey
password: pass1234

This should take you to 

https://localhost:8080/jericho/denathrius.html

If it redirects you to the error page, or a page with a red background, somethings not working and may need debugging.

If at the admin dashboard you should see a menu with one option being homework 1. If you click on it there will be a link called federate. Make sure to enter the token in the top left corner beforehand. 

The token is: kalmoru

If you open up dev tools it should show more info but the response should be rendered in html in the white section at the bottom, whether succes or error.

If everything was done correctly, you should see ping from host:port 50 times. For 5 epochs, 10 nodes. If the nodes arent live it will say failed to connect to host:port.
A fair amount of effort was put into accessibility and fault tolerance so if something doesn't work there will likely be debug info.

The nodes files are in front/cluster with each directory being the port of that server. In the log directory there is also logged information of exchanges happening, although they could be a bit more specific.

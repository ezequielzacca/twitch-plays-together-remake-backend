import express, { Request, Response, NextFunction } from "express";
import path from "path";
import cors from "cors";
import jsonwebtoken from "jsonwebtoken";
import request from "request";

const app = express();
app.use(cors());
const port = 3001; // default port to listen
const CLIENT_ID = "up6zaqijryjndl81fwle2dopnbykey";
const OWNER_ID = "96135620";
const CLIENT_SECRET = Buffer.from(
  "K/pX62YI4Vz+y48C+zdgcDyDynxpWTbi/XtVpAt6z2E=",
  "base64"
);
const JWT_SECRET = Buffer.from(
  "K/pX62YI4Vz+y48C+zdgcDyDynxpWTbi/XtVpAt6z2E=",
  "base64"
);

const decodeJWT = (jwt: string): Promise<string | object> => {
  return new Promise<string | object>((resolve, reject) => {
    jsonwebtoken.verify(jwt, JWT_SECRET, (err, decoded) => {
      if (err) {
        reject(err);
      }
      resolve(decoded);
    });
  });
};

const jwtMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const bearer = req.headers.authorization;
  if (!bearer) {
    return res.status(401);
  }
  const jwt = bearer.split(" ")[1];
  try {
    const user = await decodeJWT(jwt);
    console.log(user);
    Object.assign(req, { user: user });
    next();
  } catch (e) {
    return res.status(401);
  }
};

const makeServerToken = (channelId: string) => {
  const payload = {
    exp: Math.floor(Date.now() / 1000) + 60,
    channel_id: channelId,
    user_id: OWNER_ID, // extension owner ID for the call to Twitch PubSub
    role: "external",
    pubsub_perms: {
      send: ["broadcast"]
    }
  };
  const token = jsonwebtoken.sign(payload, CLIENT_SECRET, {
    algorithm: "HS256"
  });
  //console.log("Generated JWT: ", token);
  return token;
};

const broadCastToClient = (channelId: string, action: any) => {
  const bearer = "Bearer " + makeServerToken(channelId);
  console.log(bearer);
  const headers = {
    "Client-ID": CLIENT_ID,
    "Content-Type": "application/json",
    Authorization: bearer
  };
  const body = JSON.stringify({
    content_type: "application/json",
    message: JSON.stringify(action),
    targets: ["broadcast"]
  });
  request(
    `https://api.twitch.tv/extensions/message/${channelId}`,
    {
      method: "POST",
      headers,
      body
    },
    (err, res) => {
      if (err) {
        console.log("err: ", channelId, err);
      } else {
        console.log("success: ", channelId, res.statusCode, res.body);
      }
    }
  );
};
//authentication middleware
app.use(jwtMiddleware);

app.get("/frog", (req, res) => {
  // retrieve the user from the request
  const user = (<any>req).user;
  //broadcast to all the users within the channel
  broadCastToClient(user.channel_id, { frog: 1 });

  res.status(200);
});

// start the express server2
app.listen(port, () => {
  // tslint:disable-next-line:no-console
  console.log(`server started at http://localhost:${port}`);
});

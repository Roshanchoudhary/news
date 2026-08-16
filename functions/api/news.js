export async function onRequestGet() {

  return Response.json({
    success: true,
    news: []
  });

}

export async function onRequestPost() {

  return Response.json({
    success: true,
    message: "News API ready"
  });

}

export async function onRequestPut() {

  return Response.json({
    success: true,
    message: "News update API ready"
  });

}

export async function onRequestDelete() {

  return Response.json({
    success: true,
    message: "News delete API ready"
  });

}

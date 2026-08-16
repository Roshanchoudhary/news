export async function onRequestGet() {

  return Response.json({
    success: true,
    categories: []
  });

}

export async function onRequestPost() {

  return Response.json({
    success: true,
    message: "Category API ready"
  });

}

export async function onRequestPut() {

  return Response.json({
    success: true,
    message: "Category update API ready"
  });

}

export async function onRequestDelete() {

  return Response.json({
    success: true,
    message: "Category delete API ready"
  });

}

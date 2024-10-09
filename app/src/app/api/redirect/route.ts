export const GET = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);

    return Response.redirect("https://google.com");
  } catch (err) {
    let message = "An unknown error occurred";
    if (typeof err == "string") message = err;
    return new Response(message, {
      status: 400,
    });
  }
};

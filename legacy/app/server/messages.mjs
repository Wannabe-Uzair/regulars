// Every sentence the server sends to a user, in one place, so the copywriter's revision is a one-file change.
// Every value is verbatim from COPY.md §16: "From the API", "Client validation" (the id is noted) or
// "Also from the API" (the case is noted).
export const MSG = {
  // COPY §16, from the API
  loginMismatch: "That email and password don't match.", // 401 login
  loginTooMany: 'Too many attempts. Try again in 10 minutes.', // 429 login
  memberNotFound: "We couldn't find that member.", // 404 member
  linkInvalid: 'This link no longer works. Ask for a new one.', // 404 invite / token (invites and the kiosk token)
  role: 'Only the owner can do that. Ask your owner.', // 403 role
  duplicate: 'That email or phone number is already in use. Check it and try again.', // 409 duplicate
  generic: "Part of that form isn't valid. Check it and try again.", // 400 generic

  // COPY §16, client validation ids the server also needs
  email: 'Enter an email like name@gym.com.', // err.email
  password: 'Use 8 characters or more.', // err.password
  phone: 'Enter a 10-digit US number, or + and the country code.', // err.phone
  server: 'Something went wrong on our side. Try again in a minute.', // err.server (500)

  // COPY §14 kiosk (the server sends the 404 sentence; the client adds the action from kiosk.notFound)
  kioskNotFound: "We couldn't find that number.", // §16 404 kiosk check-in

  // COPY §16, also from the API
  kioskTooMany: 'Too many tries. Try again in a minute.', // 429 kiosk (30 tries a minute per device)
  kioskFirstName: 'Enter your first name.', // 400 kiosk join, no first name
  importTooBig: 'That file is over 2 MB. Choose a CSV of 2 MB or less.', // 400 import, file over 2 MB
  signIn: 'Log in to continue.', // 401 not logged in (any route but login)
  json: 'Send the request as JSON.', // 400 request not sent as JSON
  crossSite: "This request didn't come from Tenure.", // 403 request from another site
  notApi: "That isn't part of the Tenure API.", // 404 unknown API path
  notFound: "We couldn't find that.", // 404 anything else
  passwordTooLong: 'That password is too long. Use 200 characters or fewer.', // 400 password over 200 characters
  gymName: "Enter your gym's name.", // 400 no gym name
  yourName: 'Enter your name.', // 400 no name (sign-up, invite)
  coachName: "Enter the coach's name.", // 400 no coach name (invite)
  timezone: 'Choose a timezone from the list.', // 400 timezone
  qrLink: "That link can't be made into a QR code.", // 400 QR code for an address that isn't this computer's
  statusFilter: 'Choose a status from the list.', // 400 status filter
  coachChoice: 'Choose a coach from your staff.', // 400 coach not on staff
  coachNotFound: "We couldn't find that coach.", // 404 coach
  coachActive: 'Choose whether the coach is active.', // 400 coach active flag missing
  ownerActive: "The owner's account can't be deactivated.", // 400 deactivating the owner
  templateNotFound: "We couldn't find that template.", // 404 template
  templateName: 'Enter a name for the template.', // 400 template with no name
  templateChoice: 'Choose a template or write a message.', // 400 nudge with no template or message
  messageBody: 'Enter a message of 1,000 characters or fewer.', // 400 message missing or over 1,000 characters
  tooLarge: 'That request is over 64 KB. Send 64 KB or less.', // 413 request body over 64 KB (any route but import)
  signupTooMany: 'Too many sign-ups from this device. Try again in 10 minutes.', // 429 sign-up (5 per 10 minutes per device)
}

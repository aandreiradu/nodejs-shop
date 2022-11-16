###NodeJS Shop

### Features

- Login/Register
- User sessions using MongoDBStore
- Reset Password using your email (seding reset password emails using [SendGrid][#sendgrid] )
- Expiration token when reseting your account password.
- CSRF Protection tokens
- EJS for template engines
- Create admin account in order to add products. Upload your products images to the server.
- View more details about a specific product.
- Users can edit / delete their own products. They can't edit /delete other products if they were not created by them.
- Add products to your own cart.
- Place Orders.
- Generate invoices (PDF format) on the fly for your placed orders. [PdfKit][#pdfkit]
- Checkout.
- Pay your order using [Stripe][#stripe]

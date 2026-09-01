// Contact form handler
document.getElementById('contact-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const name = formData.get('name');
  const email = formData.get('email');
  const phone = formData.get('phone');
  const message = formData.get('message');

  // Mock handler: in production, send to backend endpoint or email service
  console.log('Contact form submission:', { name, email, phone, message });
  
  const result = document.getElementById('contact-result');
  result.textContent = 'Thank you! We will get back to you shortly.';
  result.style.color = '#064';
  
  // Reset form
  form.reset();
  
  // Clear message after 5 seconds
  setTimeout(() => {
    result.textContent = '';
  }, 5000);
});

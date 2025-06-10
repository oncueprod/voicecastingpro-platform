// Replace the existing password reset form handler in your index.html with this:

// Password reset form submission - FIXED VERSION
document.getElementById('password-reset-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    try {
        const formData = new FormData(this);
        const email = formData.get('reset-email');
        
        const response = await apiCall('/api/auth/password-reset-request', {
            method: 'POST',
            body: JSON.stringify({
                email: email
            })
        });
        
        // Hide form and show success message
        this.style.display = 'none';
        document.getElementById('reset-success').style.display = 'block';
        
        showNotification('📧 Password reset instructions sent to your email!', 'success');
        
    } catch (error) {
        showNotification(`❌ ${error.message}`, 'error');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});
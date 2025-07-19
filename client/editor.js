document.addEventListener('DOMContentLoaded', () => {
    const publishBtn = document.getElementById('publish');
    
    publishBtn.addEventListener('click', async () => {
        const title = document.getElementById('title').value;
        const author = document.getElementById('author').value;
        const difficulty = document.getElementById('difficulty').value;
        const songFile = document.getElementById('song').files[0];
        const coverFile = document.getElementById('cover').files[0];
        
        if (!title || !author || !difficulty || !songFile || !coverFile) {
            alert('Please fill all fields');
            return;
        }
        
        const formData = new FormData();
        formData.append('title', title);
        formData.append('author', author);
        formData.append('difficulty', difficulty);
        formData.append('song', songFile);
        formData.append('cover', coverFile);
        
        // For now we'll just generate random note data
        // In a real editor, you'd capture the user's note placements
        const noteData = [];
        for (let i = 0; i < 50; i++) {
            noteData.push({
                time: i * 1.5,
                direction: ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)],
                speed: 0.2
            });
        }
        formData.append('noteData', JSON.stringify(noteData));
        
        try {
            const response = await fetch('https://your-render-backend-url.onrender.com/api/levels', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                alert('Level published successfully!');
                window.location.href = 'index.html';
            } else {
                throw new Error('Failed to publish level');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to publish level. Please try again.');
        }
    });
    
    // Preview cover image
    document.getElementById('cover').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                document.getElementById('preview').innerHTML = `
                    <h3>Cover Preview</h3>
                    <img src="${event.target.result}" style="max-width: 200px;">
                `;
            };
            reader.readAsDataURL(file);
        }
    });
});

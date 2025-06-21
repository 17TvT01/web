export function renderStars(rating: number): string {
    // Ensure rating is between 0-5
    rating = Math.min(5, Math.max(0, parseFloat(rating.toString()) || 0));
    
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return `
        <div class="stars">
            ${Array(fullStars).fill('<i class="fas fa-star"></i>').join('')}
            ${hasHalfStar ? '<i class="fas fa-star-half-alt"></i>' : ''}
            ${Array(emptyStars).fill('<i class="far fa-star"></i>').join('')}
        </div>
    `;
}

export function formatPrice(price: number): string {
    return price.toLocaleString('vi-VN') + ' VNĐ';
}

export function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}
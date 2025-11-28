const { test, expect } = import('@playwright/test');
import faker from '@faker-js/faker';



const dynamicUser = {
    userName: `testuser_${faker.string.alphanumeric(8)}`,
    password: 'Password@123'
};

// ...


async function createUser(apiContext, userData) {
    const response = await apiContext.post('/Account/v1/User', {
        headers: {
            'Content-Type': 'application/json'
        },
        data: userData,
    }); 
    
    await expect(response.status()).toBe(201);
    
    
    return { 
        userId: responseBody.userID, 
        username: userData.userName 
    }; 
} 


async function generateToken(apiContext, userData) {
    const response = await apiContext.post('/Account/v1/GenerateToken', {
        data: userData,
    });
    
    await expect(response.status()).toBe(200);
    
    const responseBody = await response.json();
    return { 
        token: responseBody.token 
    };
}

test.describe('BookStore API Tests', () => {

    test('deve criar um novo usuário com sucesso', async ({ request }) => {
        
        const response = await request.post('/Account/v1/User', {
            data: dynamicUser,
        });

        const responseBody = await response.json();

        expect(response.status()).toBe(201);
        expect(responseBody).toHaveProperty('userID');
        expect(typeof responseBody.userID).toBe('string');
        expect(responseBody.username).toBe(dynamicUser.userName);
    });
    
    test('deve gerar um token de autenticação para o usuário criado', async ({ request }) => {
        
        await createUser(request, dynamicUser); 

        const tokenResponse = await request.post('/Account/v1/GenerateToken', {
            data: dynamicUser,
        });

        const responseBody = await tokenResponse.json();

        expect(tokenResponse.status()).toBe(200);
        expect(responseBody).toHaveProperty('token');
        expect(typeof responseBody.token).toBe('string');
        expect(responseBody.token.length).toBeGreaterThan(0);
        expect(responseBody.status).toBe('Success');
    });

    test('deve listar os livros, retornar status 200 e a lista não deve ser vazia', async ({ request }) => {

        const response = await request.get('/BookStore/v1/Books');
        const responseBody = await response.json();

        expect(response.status()).toBe(200);
        expect(responseBody).toHaveProperty('books');
        expect(Array.isArray(responseBody.books)).toBe(true);
        expect(responseBody.books.length).toBeGreaterThan(0);
        
        if (responseBody.books.length > 0) {
            expect(responseBody.books[0]).toHaveProperty('isbn');
            expect(responseBody.books[0]).toHaveProperty('title');
        }
    });

    test('deve adicionar um livro à coleção do usuário', async ({ request }) => {
        
        const { userId } = await createUser(request, dynamicUser); 
        const { token } = await generateToken(request, dynamicUser);

        const bookListResponse = await request.get('/BookStore/v1/Books');
        const books = (await bookListResponse.json()).books;
        const isbnToRent = books[0].isbn;

        const response = await request.post('/BookStore/v1/Books', {
            headers: {
                'Authorization': `Bearer ${token}`, 
            },
            data: {
                userId: userId,
                collectionOfIsbns: [
                    { "isbn": isbnToRent }
                ]
            }
        });

        expect(response.status()).toBe(200);
        
        const responseBody = await response.json();
        expect(responseBody).toHaveProperty('books');
        
        const rentedBook = responseBody.books.find(book => book.isbn === isbnToRent);
        expect(rentedBook).toBeDefined();
    });

});
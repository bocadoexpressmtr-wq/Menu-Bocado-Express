import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function seed() {
  console.log("Seeding reviews...");
  await addDoc(collection(db, 'reviews'), {
    customerName: 'María Gómez',
    text: '¡Los mejores cubanos de la ciudad! La salsa de la casa es increíble.',
    rating: 5,
    isVisible: true,
    createdAt: Date.now()
  });
  await addDoc(collection(db, 'reviews'), {
    customerName: 'Carlos Ruiz',
    text: 'Muy rápido el domicilio y la comida llegó caliente. Recomendado el Chori-Suizo.',
    rating: 5,
    isVisible: true,
    createdAt: Date.now() - 86400000
  });
  await addDoc(collection(db, 'reviews'), {
    customerName: 'Ana Martínez',
    text: 'Excelente servicio, las porciones son muy generosas.',
    rating: 4,
    isVisible: true,
    createdAt: Date.now() - 172800000
  });

  console.log("Setting daily offers and upsells...");
  const productsSnapshot = await getDocs(collection(db, 'products'));
  let count = 0;
  for (const productDoc of productsSnapshot.docs) {
    const data = productDoc.data();
    if (data.name.includes('Chori-Suizo') || data.name.includes('Bocado Doble')) {
      await updateDoc(doc(db, 'products', productDoc.id), { isDailyOffer: true });
    }
    if (data.name.includes('Papas') || data.name.includes('Coca-Cola') || data.name.includes('Tocineta')) {
      await updateDoc(doc(db, 'products', productDoc.id), { isUpsell: true });
    }
    count++;
  }
  console.log("Done!");
  process.exit(0);
}

seed().catch(console.error);

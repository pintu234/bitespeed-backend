const express = require('express');
const router = express.Router();
const db = require('../db'); // promise pool exported from db.js


router.get('/identify', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM bitespeed');
    res.status(200).json({ contacts: rows });
  } catch (err) {
    console.error('Error fetching contacts:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/identify', async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({ error: 'At least one of email or phoneNumber must be provided' });
    }

    // Step 1: Find all contacts where email or phoneNumber matches the request
    const [contacts] = await db.query(
      `SELECT * FROM bitespeed 
       WHERE email = ? OR phoneNumber = ?`,
      [email || '', phoneNumber || '']
    );

    // If no contacts found, create a new primary contact and return it
    if (contacts.length === 0) {
      const now = new Date();
      const [insertResult] = await db.query(
        `INSERT INTO bitespeed (email, phoneNumber, linkPrecedence, createdAt, updatedAt) VALUES (?, ?, 'primary', ?, ?)`,
        [email || null, phoneNumber || null, now, now]
      );

      return res.status(200).json({
        contact: {
          primaryContactId: insertResult.insertId,
          emails: email ? [email] : [],
          phoneNumbers: phoneNumber ? [phoneNumber] : [],
          secondaryContactIds: []
        }
      });
    }

    // Step 2: Find all linked contacts based on linkedId or ids of found contacts
    // First, collect all ids found and their linkedId references
    const linkedIdsSet = new Set();

    contacts.forEach(c => {
      linkedIdsSet.add(c.id);
      if (c.linkPrecedence === 'secondary' && c.linkedId) {
        linkedIdsSet.add(c.linkedId);
      }
    });

    const linkedIds = Array.from(linkedIdsSet);

    // Fetch all linked contacts from DB
    const [allLinkedContacts] = await db.query(
      `SELECT * FROM bitespeed WHERE id IN (?) OR linkedId IN (?)`,
      [linkedIds, linkedIds]
    );

    // Include the contacts found earlier that might not have linkedId set but are relevant
    const combinedContacts = [...new Map(allLinkedContacts.concat(contacts).map(c => [c.id, c])).values()];

    // Step 3: Find the oldest contact (primary)
    const primaryContact = combinedContacts.reduce((oldest, c) => {
      if (!oldest) return c;
      return new Date(c.createdAt) < new Date(oldest.createdAt) ? c : oldest;
    }, null);

    // Step 4: Update contacts to have consistent linkPrecedence and linkedId values
    // primaryContact should have linkPrecedence = primary and linkedId = null
    // others should be secondary linked to primaryContact.id

    // Prepare updates only if needed
    const updates = combinedContacts.filter(c =>
      (c.id === primaryContact.id && (c.linkPrecedence !== 'primary' || c.linkedId !== null)) ||
      (c.id !== primaryContact.id && (c.linkPrecedence !== 'secondary' || c.linkedId !== primaryContact.id))
    );

    for (const contact of updates) {
      if (contact.id === primaryContact.id) {
        await db.query(
          `UPDATE bitespeed SET linkPrecedence = 'primary', linkedId = NULL, updatedAt = ? WHERE id = ?`,
          [new Date(), contact.id]
        );
      } else {
        await db.query(
          `UPDATE bitespeed SET linkPrecedence = 'secondary', linkedId = ?, updatedAt = ? WHERE id = ?`,
          [primaryContact.id, new Date(), contact.id]
        );
      }
    }

    // Step 5: Consolidate unique emails, phoneNumbers, and secondary IDs
    const emailsSet = new Set();
    const phoneNumbersSet = new Set();
    const secondaryContactIds = [];

    combinedContacts.forEach(c => {
      if (c.email) emailsSet.add(c.email);
      if (c.phoneNumber) phoneNumbersSet.add(c.phoneNumber);
      if (c.linkPrecedence === 'secondary') secondaryContactIds.push(c.id);
    });

    // Step 6: If incoming request contains new email or phoneNumber not already in any linked contact,
    // create a new secondary contact linked to primaryContact.id

    const emailsArray = Array.from(emailsSet);
    const phoneNumbersArray = Array.from(phoneNumbersSet);

    const newEmail = email && !emailsSet.has(email);
    const newPhone = phoneNumber && !phoneNumbersSet.has(phoneNumber);

    if (newEmail || newPhone) {
      const now = new Date();
      await db.query(
        `INSERT INTO bitespeed (email, phoneNumber, linkPrecedence, linkedId, createdAt, updatedAt) VALUES (?, ?, 'secondary', ?, ?, ?)`,
        [
          newEmail ? email : null,
          newPhone ? phoneNumber : null,
          primaryContact.id,
          now,
          now
        ]
      );
      // Add to secondaryContactIds and emails/phones sets
      if (newEmail) emailsSet.add(email);
      if (newPhone) phoneNumbersSet.add(phoneNumber);

      // To get the new inserted id, you could query last insertId if needed.
      // For simplicity, skip adding new secondary ID to response (optional).
    }

    // Step 7: Prepare response
    res.status(200).json({
      contact: {
        primaryContactId: primaryContact.id,
        emails: Array.from(emailsSet),
        phoneNumbers: Array.from(phoneNumbersSet),
        secondaryContactIds
      }
    });
  } catch (err) {
    console.error('Error in /identify:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

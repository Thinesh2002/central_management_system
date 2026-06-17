const bcrypt = require('bcrypt');
const User = require('../../models/user_model');
const generateToken = require('../../utils/generateToken');

const SALT_ROUNDS = 10;

const nowString = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

exports.register = async (req, res) => {
  try {
    const { name, user_id, email, password } = req.body;

    if (!password) return res.status(400).json({ message: 'Password is required' });
    if (!email && !user_id) return res.status(400).json({ message: 'Provide email or user_id' });

    // check uniqueness
    if (email) {
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) return res.status(400).json({ message: 'Email already in use' });
    }
    if (user_id) {
      const existingUserId = await User.findByUserId(user_id);
      if (existingUserId) return res.status(400).json({ message: 'User ID already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const created_at = nowString();

    const insertId = await User.createUser({ name, user_id, email, hashedPassword, created_at });

    const newUser = await User.findById(insertId);
    const token = generateToken(newUser);

    res.status(201).json({
      message: 'User registered',
      user: { id: newUser.id, name: newUser.name, user_id: newUser.user_id, email: newUser.email, created_at: newUser.created_at },
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { login, password } = req.body; 
    if (!login || !password)
      return res.status(400).json({ message: 'Login and password required' });

    const user = await User.findByLogin(login);
    if (!user)
      return res.status(400).json({ message: 'Invalid login or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: 'Invalid login or password' });

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        user_id: user.user_id,
        email: user.email
      },
      token
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    // do not return password
    delete user.password;
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params; // update by id
    const { name, user_id, email, password } = req.body;

    // if email/user_id being updated, ensure uniqueness
    if (email) {
      const existing = await User.findByEmail(email);
      if (existing && existing.id !== Number(id)) return res.status(400).json({ message: 'Email already in use' });
    }
    if (user_id) {
      const existingUid = await User.findByUserId(user_id);
      if (existingUid && existingUid.id !== Number(id)) return res.status(400).json({ message: 'User ID already in use' });
    }

    const updateObj = {};
    if (name !== undefined) updateObj.name = name;
    if (user_id !== undefined) updateObj.user_id = user_id;
    if (email !== undefined) updateObj.email = email;
    if (password !== undefined && password !== '') {
      const hashed = await bcrypt.hash(password, SALT_ROUNDS);
      updateObj.hashedPassword = hashed;
    }

    const affected = await User.updateUserById(id, updateObj);
    if (affected === 0) return res.status(400).json({ message: 'No fields updated or user not found' });

    const updated = await User.findById(id);
    delete updated.password;
    res.json({ message: 'User updated', user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const affected = await User.deleteUserById(id);
    if (affected === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.listUsers = async (req, res) => {
  try {
    const users = await User.getAllUsers();
    return res.json({ users });
  } catch (err) {
    console.error('listUsers error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.stats = async (req, res) => {
  try {
    const total = await User.getUserCount();
    const recent = await User.getRecentUsers(5);
    return res.json({ total, recent });
  } catch (err) {
    console.error('stats error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};



exports.me = async (req, res) => {
  try {
    const id = req.userId;
    if (!id) return res.status(401).json({ message: 'Not authorized' });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // remove password before sending
    delete user.password;
    res.json(user);
  } catch (err) {
    console.error('me handler error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

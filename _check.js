
        // State Management
        const state = {
            currentUser: null,
            dockets: JSON.parse(localStorage.getItem('dockets')) || [],
            registeredUsers: JSON.parse(localStorage.getItem('registeredUsers')) || [],
            complaints: JSON.parse(localStorage.getItem('complaints')) || [],
            docketBeingCompleted: null,
            activeChatDocket: null
        };

        const app = {
            init() {
                const user = JSON.parse(localStorage.getItem('user'));
                if (user) {
                    state.currentUser = user;
                    this.showView(`view-${user.role}`);
                    this.updateUserInfo();
                    this.render();
                }
            },

            toggleDutyStatus(status) {
                const username = state.currentUser.username;
                const idx = state.registeredUsers.findIndex(u => (typeof u === 'string' ? u : u.username) === username);
                if (idx !== -1) {
                    const emp = state.registeredUsers[idx];
                    if (typeof emp === 'string') {
                        state.registeredUsers[idx] = { username: emp, role: 'employee', status: status };
                    } else {
                        emp.status = status;
                    }
                    this.save();
                    this.render();
                    alert(`Duty status updated to: ${status === 'online' ? 'Available (Online)' : 'Offline'}`);
                }
            },

            capturedLocation: null,

            handleLocationCheckboxChange(checkbox) {
                const badge = document.getElementById('location-status-badge');
                const display = document.getElementById('location-details-display');
                const coordsText = document.getElementById('location-coords-text');

                if (checkbox.checked) {
                    badge.style.display = 'inline-block';
                    badge.className = 'badge pending';
                    badge.textContent = 'Acquiring...';
                    display.style.display = 'flex';
                    coordsText.textContent = 'Getting GPS location...';
                    coordsText.style.color = 'var(--warning)';

                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const lat = position.coords.latitude;
                            const lng = position.coords.longitude;
                            app.capturedLocation = { lat, lng };

                            badge.className = 'badge completed';
                            badge.style.background = 'rgba(16, 185, 129, 0.2)';
                            badge.style.color = 'var(--success)';
                            badge.textContent = 'Shared';

                            coordsText.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                            coordsText.style.color = 'var(--success)';
                        },
                        (error) => {
                            console.error(error);
                            let errMsg = 'Failed to get location';
                            if (error.code === error.PERMISSION_DENIED) {
                                errMsg = 'Permission Denied. Please enable GPS.';
                            }
                            badge.className = 'badge pending';
                            badge.style.background = 'rgba(239, 68, 68, 0.2)';
                            badge.style.color = '#ef4444';
                            badge.textContent = 'Failed';

                            coordsText.textContent = errMsg;
                            coordsText.style.color = '#ef4444';
                            checkbox.checked = false;
                            app.capturedLocation = null;
                        },
                        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
                    );
                } else {
                    app.capturedLocation = null;
                    badge.style.display = 'none';
                    display.style.display = 'none';
                }
            },

            toggleChat(id) {
                state.activeChatDocket = state.activeChatDocket === id ? null : id;
                this.render();
            },

            sendChatMessage(id) {
                const input = document.getElementById(`chat-input-${id}`);
                const text = input.value.trim();
                if (!text) return;

                const docket = state.dockets.find(d => d.id === id);
                if (docket) {
                    if (!docket.chat) docket.chat = [];
                    docket.chat.push({
                        sender: state.currentUser.username,
                        text: text,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    });
                    this.save();
                    this.render();
                }
            },

            selectedRatings: {},
            setRating(id, rating) {
                this.selectedRatings[id] = rating;
                for (let i = 1; i <= 5; i++) {
                    const star = document.getElementById(`star-${id}-${i}`);
                    if (star) {
                        if (i <= rating) {
                            star.style.color = '#f59e0b';
                        } else {
                            star.style.color = '#475569';
                        }
                    }
                }
            },

            submitFeedback(id) {
                const rating = this.selectedRatings[id] || 5;
                const reviewInput = document.getElementById(`review-${id}`);
                const review = reviewInput ? reviewInput.value.trim() : "";

                const docket = state.dockets.find(d => d.id === id);
                if (docket) {
                    docket.rating = rating;
                    docket.review = review;
                    this.save();
                    this.render();
                    alert("Thank you for your feedback!");
                }
            },

            openInvoiceModal(id) {
                const docket = state.dockets.find(d => d.id === id);
                if (!docket) return;

                const getEmployeeName = (username) => {
                    const emp = state.registeredUsers.find(u => (typeof u === 'string' ? u : u.username) === username);
                    return emp && emp.name ? emp.name : username;
                };

                const getCustomerDetails = (username) => {
                    const cust = state.registeredUsers.find(u => (typeof u === 'string' ? u : u.username) === username);
                    return {
                        name: cust && cust.name ? cust.name : username,
                        mobile: cust && cust.mobile ? cust.mobile : 'Not Provided',
                        address: cust && cust.address ? cust.address : docket.address
                    };
                };

                const cust = getCustomerDetails(docket.customer);
                const empName = getEmployeeName(docket.assignedTo);

                const content = document.getElementById('invoice-modal-content');
                content.innerHTML = `
                    <div class="invoice-box">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px;">
                            <div>
                                <h2 style="color: var(--primary); font-weight: 700; font-size: 1.6rem; margin: 0; background: linear-gradient(to right, #4f46e5, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Trust Home Services</h2>
                                <p style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">Helpline / WhatsApp: +91 7501257731</p>
                            </div>
                            <div style="text-align: right;">
                                <h3 style="margin: 0; font-size: 1.2rem; color: #475569;">INVOICE</h3>
                                <p style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">Invoice #: INV-${docket.id.slice(-6)}</p>
                                <p style="font-size: 0.85rem; color: #64748b;">Date: ${docket.completedDate || docket.date}</p>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; font-size: 0.9rem; line-height: 1.5;">
                            <div>
                                <strong style="color: #475569; display: block; margin-bottom: 4px;">Billed To:</strong>
                                <div>Name: ${cust.name}</div>
                                <div>Mobile: ${cust.mobile}</div>
                                <div>Address: ${cust.address}</div>
                            </div>
                            <div>
                                <strong style="color: #475569; display: block; margin-bottom: 4px;">Service Provider:</strong>
                                <div>Technician: ${empName}</div>
                                <div>Task: ${docket.title}</div>
                                <div>Type: ${docket.type.toUpperCase()}</div>
                            </div>
                        </div>

                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 0.95rem;">
                            <thead>
                                <tr>
                                    <th style="text-align: left; padding: 10px; border-bottom: 2px solid #cbd5e1; background: #f8fafc; color: #475569;">Description</th>
                                    <th style="text-align: right; padding: 10px; border-bottom: 2px solid #cbd5e1; background: #f8fafc; color: #475569;">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155;">Service Fee (${docket.title})</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500;">₹${docket.serviceFee || docket.amountReceived || 0}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155;">Material Charges / Logistics</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500;">₹${docket.materialCosts || 0}</td>
                                </tr>
                                <tr style="font-weight: 700; font-size: 1.1rem; color: #1e293b;">
                                    <td style="padding: 15px 10px 10px 10px; border-bottom: none;">Grand Total</td>
                                    <td style="padding: 15px 10px 10px 10px; border-bottom: none; text-align: right; color: var(--primary);">₹${docket.amountReceived || 0}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 15px; border-radius: 6px; font-size: 0.85rem; color: #475569;">
                            <div>Payment Method: <span style="font-weight: 600; text-transform: uppercase;">${docket.paymentMethod || 'Cash'}</span></div>
                            <div style="font-weight: 600; color: #16a34a;">PAID RECEIPT</div>
                        </div>

                        <div style="text-align: center; margin-top: 30px; font-size: 0.85rem; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                            Thank you for trusting Home Services! Keep this invoice for your warranty reference.
                        </div>

                        <div style="margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end;">
                            <button id="invoice-print-btn" onclick="window.print()" style="background: var(--primary); color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; width: auto;">Print Invoice</button>
                        </div>
                    </div>
                `;

                document.getElementById('invoice-modal').classList.add('active');
            },

            closeInvoiceModal() {
                document.getElementById('invoice-modal').classList.remove('active');
            },

            // 3D Payment Checkout Logic
            openPaymentModal(id) {
                const docket = state.dockets.find(d => d.id === id);
                if (!docket) return;

                document.getElementById('payment-docket-id').value = id;
                document.getElementById('pay-submit-btn').textContent = `Pay ₹${docket.amountReceived || docket.serviceFee || 0} Securely`;

                document.getElementById('payment-form').reset();
                this.updateCardVisuals();
                this.flipCard(false);

                document.getElementById('payment-modal').classList.add('active');
            },

            closePaymentModal() {
                document.getElementById('payment-modal').classList.remove('active');
            },

            flipCard(toBack) {
                const card = document.getElementById('credit-card-visual');
                if (toBack) {
                    card.classList.add('flipped');
                } else {
                    card.classList.remove('flipped');
                }
            },

            updateCardVisuals() {
                let numInput = document.getElementById('pay-card-num');
                let rawNum = numInput.value.replace(/\D/g, '');
                let formattedNum = rawNum.match(/.{1,4}/g)?.join(' ') || '';
                numInput.value = formattedNum;

                document.getElementById('card-display-number').textContent = formattedNum || '#### #### #### ####';

                let expInput = document.getElementById('pay-card-expiry');
                let rawExp = expInput.value.replace(/\D/g, '');
                if (rawExp.length > 2) {
                    rawExp = rawExp.slice(0, 2) + '/' + rawExp.slice(2, 4);
                }
                expInput.value = rawExp;

                let name = document.getElementById('pay-card-name').value;
                document.getElementById('card-display-name').textContent = name || 'CARDHOLDER NAME';
                document.getElementById('card-display-expiry').textContent = rawExp || 'MM/YY';

                let cvv = document.getElementById('pay-card-cvv').value;
                document.getElementById('card-display-cvv').textContent = cvv || '***';

                const logo = document.getElementById('card-type-logo');
                if (rawNum.startsWith('4')) logo.textContent = 'VISA';
                else if (rawNum.startsWith('5')) logo.textContent = 'MasterCard';
                else if (rawNum.startsWith('3')) logo.textContent = 'AMEX';
                else logo.textContent = 'BANK';
            },

            processPayment(e) {
                e.preventDefault();
                const id = document.getElementById('payment-docket-id').value;
                const docket = state.dockets.find(d => d.id === id);
                if (docket) {
                    const btn = document.getElementById('pay-submit-btn');
                    const ogText = btn.textContent;
                    btn.textContent = 'Processing...';
                    btn.style.opacity = '0.7';

                    setTimeout(() => {
                        docket.paymentMethod = 'Online (Paid)';
                        docket.isPaid = true;
                        this.save();
                        this.render();

                        btn.textContent = 'Success!';
                        btn.style.background = '#10b981';

                        setTimeout(() => {
                            this.closePaymentModal();
                            btn.textContent = ogText;
                            btn.style.opacity = '1';
                            this.openInvoiceModal(id);
                        }, 800);
                    }, 1200);
                }
            },

            getChatHtml(d) {
                if (state.activeChatDocket !== d.id) return '';
                const chats = d.chat || [];
                const messagesHtml = chats.map(msg => {
                    const isSelf = msg.sender === state.currentUser.username;
                    return `
                        <div class="chat-bubble ${isSelf ? 'sent' : 'received'}">
                            <div style="font-weight: 600; font-size: 0.75rem; margin-bottom: 2px;">${msg.sender}</div>
                            <div>${msg.text}</div>
                            <div class="chat-bubble-meta">${msg.time}</div>
                        </div>
                    `;
                }).join('');

                // Auto scroll messages to bottom on immediate render frame
                setTimeout(() => {
                    const msgDiv = document.getElementById(`chat-messages-${d.id}`);
                    if (msgDiv) msgDiv.scrollTop = msgDiv.scrollHeight;
                }, 50);

                return `
                    <div class="chat-container">
                        <div class="chat-header">
                            <span>Chat Thread</span>
                            <span style="color: var(--text-muted); cursor: pointer;" onclick="app.toggleChat('${d.id}')">Close &times;</span>
                        </div>
                        <div class="chat-messages" id="chat-messages-${d.id}">
                            ${messagesHtml.length ? messagesHtml : '<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 20px;">No messages yet. Send a message to start!</div>'}
                        </div>
                        <div class="chat-input-panel">
                            <input type="text" id="chat-input-${d.id}" placeholder="Type a message..." onkeydown="if(event.key === 'Enter') app.sendChatMessage('${d.id}')">
                            <button onclick="app.sendChatMessage('${d.id}')" style="width:auto; padding: 10px 16px;">Send</button>
                        </div>
                    </div>
                `;
            },

            save() {
                localStorage.setItem('dockets', JSON.stringify(state.dockets));
                localStorage.setItem('registeredUsers', JSON.stringify(state.registeredUsers));
                localStorage.setItem('complaints', JSON.stringify(state.complaints));
            },

            toggleAuth(mode) {
                document.getElementById('auth-mode').value = mode;
                const signupFields = document.getElementById('signup-fields');
                const extraInputs = signupFields.querySelectorAll('input');
                const roleSelect = document.getElementById('auth-role');

                if (mode === 'login') {
                    document.getElementById('auth-title').textContent = 'Welcome Back';
                    document.getElementById('auth-submit').textContent = 'Sign In';
                    document.getElementById('btn-tab-login').style.background = 'var(--primary)';
                    document.getElementById('btn-tab-signup').style.background = 'rgba(255, 255, 255, 0.1)';
                    document.getElementById('demo-creds').style.display = 'block';
                    signupFields.style.display = 'none';
                    roleSelect.style.display = 'block';
                    extraInputs.forEach(input => input.required = false);
                } else {
                    document.getElementById('auth-title').textContent = 'Create Account';
                    document.getElementById('auth-submit').textContent = 'Sign Up';
                    document.getElementById('btn-tab-signup').style.background = 'var(--primary)';
                    document.getElementById('btn-tab-login').style.background = 'rgba(255, 255, 255, 0.1)';
                    document.getElementById('demo-creds').style.display = 'none';
                    roleSelect.value = 'customer';
                    roleSelect.style.display = 'none';
                    signupFields.style.display = 'block';
                    extraInputs.forEach(input => input.required = true);
                }
                this.handleRoleChange();
            },

            handleRoleChange() {
                const mode = document.getElementById('auth-mode').value;
                const role = document.getElementById('auth-role').value;
                const textInput = document.getElementById('auth-username-text');
                const selectInput = document.getElementById('auth-username-select');

                // If role isn't selected yet, default to text input (e.g. initial load)
                if (!role) return;

                if (mode === 'signup' || role === 'customer') {
                    textInput.style.display = 'block';
                    textInput.required = true;
                    selectInput.style.display = 'none';
                    selectInput.required = false;
                } else if (role === 'admin') {
                    textInput.style.display = 'none';
                    textInput.required = false;
                    selectInput.style.display = 'none';
                    selectInput.required = false;
                } else if (role === 'employee') {
                    textInput.style.display = 'none';
                    textInput.required = false;
                    selectInput.style.display = 'block';
                    selectInput.required = true;

                    const employees = this.getEmployees ? this.getEmployees() : [];
                    selectInput.innerHTML = '<option value="" disabled selected>Select your name</option>' +
                        employees.map(emp => `<option value="${emp.username}">${emp.name || emp.username}</option>`).join('');
                }
            },

            handleAuth(e) {
                e.preventDefault();
                const mode = document.getElementById('auth-mode').value;
                const role = document.getElementById('auth-role').value;
                let username = '';

                if (mode === 'signup' || role === 'customer') {
                    username = document.getElementById('auth-username-text').value;
                } else if (role === 'admin') {
                    username = 'admin';
                } else if (role === 'employee') {
                    username = document.getElementById('auth-username-select').value;
                }
                const password = document.getElementById('auth-password').value;

                if (mode === 'signup') {
                    // Filter out old string representations in case user tested previously
                    const existingUsernames = state.registeredUsers.map(u => typeof u === 'string' ? u : u.username);

                    if (existingUsernames.includes(username)) {
                        alert("Username already exists! Please choose another.");
                        return;
                    }

                    const newUser = {
                        username,
                        role,
                        name: document.getElementById('auth-name').value,
                        address: document.getElementById('auth-address').value,
                        mobile: document.getElementById('auth-mobile').value,
                        email: document.getElementById('auth-email').value,
                        password: password
                    };

                    state.registeredUsers.push(newUser);
                    this.save();
                    alert("Account created successfully!");
                } else {
                    // Check credentials for login
                    const registeredUser = state.registeredUsers.find(u => u.username === username);
                    const demoUsers = ['admin', 'emp1', 'emp2', 'cust1', 'cust2'];

                    if (registeredUser) {
                        if (registeredUser.role !== role) {
                            alert("Invalid role for this username.");
                            return;
                        }
                        if (registeredUser.password !== password) {
                            alert("Incorrect password!");
                            return;
                        }
                    } else if (!demoUsers.includes(username)) {
                        alert("Username not found. Please check your username or sign up.");
                        return;
                    }
                }

                state.currentUser = { role, username };
                localStorage.setItem('user', JSON.stringify(state.currentUser));

                this.showView(`view-${role}`);
                this.updateUserInfo();
                this.render();
                e.target.reset();
                this.toggleAuth('login');
            },

            logout() {
                state.currentUser = null;
                localStorage.removeItem('user');
                this.showView('view-login');
                document.getElementById('user-info').style.display = 'none';
                this.showHeroBg();
            },

            updateUserInfo() {
                const info = document.getElementById('user-info');
                const greeting = document.getElementById('user-greeting');
                info.style.display = 'flex';
                greeting.textContent = `Hello, ${state.currentUser.username} (${state.currentUser.role})`;
            },

            showView(viewId) {
                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                document.getElementById(viewId).classList.add('active');

                // Show hero bg only on login page
                if (viewId === 'view-login') {
                    this.showHeroBg();
                } else {
                    this.hideHeroBg();
                }

                if (viewId === 'view-admin') {
                    // Leaflet map requires container to be visible during initialization
                    setTimeout(() => app.initAdminMap(), 50);
                    // Render the background preview in admin
                    setTimeout(() => app.renderBgPreview(), 100);
                }
            },

            adminMap: null,
            mapMarkersGroup: null,

            initAdminMap() {
                const mapContainer = document.getElementById('admin-map');
                if (!mapContainer) return;

                if (app.adminMap) {
                    app.adminMap.invalidateSize();
                    app.renderAdminMap();
                    return;
                }

                // Initialized centered on a generic city coordinates default
                app.adminMap = L.map('admin-map', {
                    zoomControl: true,
                    attributionControl: true
                }).setView([22.5726, 88.3639], 12);

                // Premium Dark Matter Map cartography tiles
                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                    subdomains: 'abcd',
                    maxZoom: 20
                }).addTo(app.adminMap);

                app.renderAdminMap();
            },

            renderAdminMap() {
                if (!app.adminMap) return;

                // Clear previous layers
                if (app.mapMarkersGroup) {
                    app.adminMap.removeLayer(app.mapMarkersGroup);
                }
                app.mapMarkersGroup = L.layerGroup().addTo(app.adminMap);

                const activeDockets = state.dockets.filter(d => d.location);
                if (activeDockets.length === 0) {
                    app.adminMap.setView([22.5726, 88.3639], 12);
                    return;
                }

                const bounds = [];

                activeDockets.forEach(d => {
                    let pinColor = '#f59e0b'; // pending
                    if (d.status === 'assigned') pinColor = '#818cf8'; // assigned
                    else if (d.status === 'completed') pinColor = '#10b981'; // completed

                    const customIcon = L.divIcon({
                        className: 'custom-map-pin',
                        html: `<div style="display:flex; justify-content:center; align-items:center;">
                            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.55));">
                                <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="${pinColor}"/>
                            </svg>
                        </div>`,
                        iconSize: [34, 34],
                        iconAnchor: [17, 34],
                        popupAnchor: [0, -32]
                    });

                    const popupContent = `
                        <div style="font-family:'Inter', sans-serif; color:#1e293b; min-width:180px; padding: 4px;">
                            <div style="font-weight:700; font-size:0.95rem; margin-bottom:4px; line-height:1.2;">${d.title}</div>
                            <div style="font-size:0.8rem; margin-bottom:6px; font-weight:600; text-transform:uppercase; color:${pinColor};">${d.status.toUpperCase()}</div>
                            <div style="font-size:0.8rem; margin-bottom:4px; color:#475569;"><strong>Customer:</strong> ${d.customer}</div>
                            <div style="font-size:0.8rem; margin-bottom:6px; color:#475569;"><strong>Address:</strong> ${d.address}</div>
                            <a href="https://www.google.com/maps?q=${d.location.lat},${d.location.lng}" target="_blank" style="display:inline-block; font-size:0.75rem; color:#4f46e5; text-decoration:underline; font-weight:600; margin-top:2px;">Google Maps Navigation</a>
                        </div>
                    `;

                    L.marker([d.location.lat, d.location.lng], { icon: customIcon })
                        .bindPopup(popupContent)
                        .addTo(app.mapMarkersGroup);

                    bounds.push([d.location.lat, d.location.lng]);
                });

                if (bounds.length > 0) {
                    app.adminMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
                }
            },
            // --- AI Diagnostics Assistant Logic ---
            diagnosticsState: {
                step: 0,
                issueType: null,
                details: []
            },

            startAiDiagnostics() {
                const container = document.getElementById('ai-diagnostics-container');
                if (container.style.display === 'block') {
                    container.style.display = 'none';
                    return;
                }

                container.style.display = 'block';
                this.diagnosticsState = { step: 0, issueType: null, details: [] };

                const history = document.getElementById('ai-chat-history');
                history.innerHTML = `
                    <div style="background: rgba(139, 92, 246, 0.1); padding: 10px; border-radius: 8px; font-size: 0.9rem; align-self: flex-start; max-width: 85%; border: 1px solid rgba(139,92,246,0.2);">
                        Hi there! I'm your AI diagnostic assistant. I can help quickly troubleshoot your issue and pre-fill a service request. What seems to be the problem today?
                    </div>
                `;

                this.renderAiOptions([
                    { text: 'Electrical Issue ⚡', next: 'electrical' },
                    { text: 'Plumbing Leak 💧', next: 'plumbing' },
                    { text: 'Appliance Broken 🧊', next: 'appliance' },
                    { text: 'General Repair 🔨', next: 'general' }
                ]);
            },

            renderAiOptions(options) {
                const container = document.getElementById('ai-chat-options');
                container.innerHTML = options.map(opt =>
                    `<button type="button" class="btn-small secondary" style="width: auto; padding: 6px 12px; font-size: 0.8rem; background: rgba(255,255,255,0.05);" onclick="app.handleAiOption('${opt.text}', '${opt.next}')">${opt.text}</button>`
                ).join('');
            },

            addAiMessage(text, isUser = false) {
                const history = document.getElementById('ai-chat-history');
                const bubbleHtml = isUser
                    ? `<div style="background: var(--primary); padding: 10px; border-radius: 8px; font-size: 0.9rem; align-self: flex-end; max-width: 85%; color: white;">${text}</div>`
                    : `<div style="background: rgba(139, 92, 246, 0.1); padding: 10px; border-radius: 8px; font-size: 0.9rem; align-self: flex-start; max-width: 85%; border: 1px solid rgba(139,92,246,0.2);">${text}</div>`;

                history.innerHTML += bubbleHtml;
                setTimeout(() => { history.scrollTop = history.scrollHeight; }, 50);
            },

            handleAiOption(text, nextAction) {
                this.addAiMessage(text, true);
                document.getElementById('ai-chat-options').innerHTML = ''; // clear options

                // Simulate thinking
                setTimeout(() => {
                    this.processAiLogic(nextAction, text);
                }, 600);
            },

            processAiLogic(action, text) {
                if (['electrical', 'plumbing', 'appliance', 'general'].includes(action)) {
                    this.diagnosticsState.issueType = action;
                    this.diagnosticsState.details.push(text);
                    this.addAiMessage(`Got it. For the ${text.split(' ')[0].toLowerCase()}, is it an emergency (e.g. sparking, flooding) or a standard repair?`);
                    this.renderAiOptions([
                        { text: '🚨 Emergency!', next: 'emergency' },
                        { text: '📅 Standard Repair', next: 'standard' }
                    ]);
                }
                else if (action === 'emergency' || action === 'standard') {
                    this.diagnosticsState.details.push(text);
                    this.addAiMessage("Understood. I will prepare the docket for you. Please confirm to auto-fill the form below.");
                    this.renderAiOptions([
                        { text: '✅ Auto-Fill Docket', next: 'autofill' },
                        { text: '❌ Cancel', next: 'cancel' }
                    ]);
                }
                else if (action === 'autofill') {
                    this.addAiMessage("Form filled successfully! You can review and submit it below.");
                    document.getElementById('ai-chat-options').innerHTML = '';

                    // Autofill logic
                    const typeSelect = document.getElementById('docket-type');
                    typeSelect.value = 'repair';

                    const isEmergency = this.diagnosticsState.details[1].includes('Emergency');
                    const titlePrefix = isEmergency ? '[URGENT] ' : '';
                    document.getElementById('docket-title').value = `${titlePrefix}${this.diagnosticsState.details[0]} Issue`;

                    document.getElementById('docket-desc').value = `AI Diagnostic Summary:\n- Category: ${this.diagnosticsState.issueType.toUpperCase()}\n- Priority: ${isEmergency ? 'EMERGENCY' : 'STANDARD'}\n\nPlease dispatch someone ASAP.`;

                    // Flash the form to draw attention
                    const form = document.getElementById('docket-form');
                    form.style.transition = 'background 0.5s';
                    form.style.background = 'rgba(139, 92, 246, 0.2)';
                    setTimeout(() => { form.style.background = 'transparent'; }, 800);
                }
                else if (action === 'cancel') {
                    document.getElementById('ai-diagnostics-container').style.display = 'none';
                }
            },
            // --- End AI Diagnostics ---

            createDocket(e) {
                e.preventDefault();
                const newDocket = {
                    id: Date.now().toString(),
                    customer: state.currentUser.username,
                    type: document.getElementById('docket-type').value,
                    title: document.getElementById('docket-title').value,
                    desc: document.getElementById('docket-desc').value,
                    address: document.getElementById('docket-address').value,
                    preferredDate: document.getElementById('docket-pref-date').value,
                    status: 'pending', // pending, assigned, completed
                    assignedTo: null,
                    date: new Date().toLocaleDateString()
                };

                if (app.capturedLocation) {
                    newDocket.location = app.capturedLocation;
                }

                state.dockets.unshift(newDocket);
                this.save();
                this.render();

                // Reset location share UI
                app.capturedLocation = null;
                const checkbox = document.getElementById('docket-share-location');
                if (checkbox) checkbox.checked = false;
                const badge = document.getElementById('location-status-badge');
                if (badge) badge.style.display = 'none';
                const display = document.getElementById('location-details-display');
                if (display) display.style.display = 'none';

                e.target.reset();
            },

            submitComplaint(e) {
                e.preventDefault();
                const newComplaint = {
                    id: Date.now().toString(),
                    customer: state.currentUser.username,
                    title: document.getElementById('complaint-title').value,
                    desc: document.getElementById('complaint-desc').value,
                    status: 'pending', // pending, resolved
                    date: new Date().toLocaleDateString()
                };

                state.complaints.unshift(newComplaint);
                this.save();
                this.render();
                e.target.reset();
                alert("Complaint submitted successfully!");
            },

            assignDocket(id, employee) {
                if (!employee) return;
                const docket = state.dockets.find(d => d.id === id);
                if (docket) {
                    docket.status = 'assigned';
                    docket.assignedTo = employee;
                    this.save();
                    this.render();
                }
            },

            rejectDocket(id, isCustomer = false) {
                const docket = state.dockets.find(d => d.id === id);
                if (docket) {
                    const promptText = isCustomer ? "Enter reason for cancelling this request:" : "Enter reason for rejection:";
                    let reason = prompt(promptText);
                    if (reason !== null) {
                        reason = reason.trim() === '' ? (isCustomer ? 'Cancelled by customer' : 'No reason provided') : reason.trim();
                        docket.status = 'rejected';
                        docket.rejectionReason = reason;
                        this.save();
                        this.render();
                    }
                }
            },

            startCompletion(id) {
                state.docketBeingCompleted = id;
                this.render();
            },

            cancelCompletion() {
                state.docketBeingCompleted = null;
                this.render();
            },

            submitCompletion(id) {
                const serviceFeeInput = document.getElementById(`service-fee-${id}`);
                const materialCostInput = document.getElementById(`material-cost-${id}`);
                const paySelect = document.getElementById(`pay-${id}`);

                const serviceFee = parseFloat(serviceFeeInput.value) || 0;
                const materialCosts = parseFloat(materialCostInput.value) || 0;

                if (isNaN(serviceFee) || serviceFee < 0 || isNaN(materialCosts) || materialCosts < 0) {
                    alert("Please enter valid amounts (0 or more).");
                    return;
                }

                const amount = serviceFee + materialCosts;
                const method = paySelect.value;
                const docket = state.dockets.find(d => d.id === id);
                if (docket) {
                    docket.status = 'completed';
                    docket.completedDate = new Date().toISOString().split('T')[0];
                    docket.serviceFee = serviceFee;
                    docket.materialCosts = materialCosts;
                    docket.amountReceived = amount;
                    docket.paymentMethod = method;
                    state.docketBeingCompleted = null;

                    // Reset employee status to online
                    const empIdx = state.registeredUsers.findIndex(u => (typeof u === 'string' ? u : u.username) === state.currentUser.username);
                    if (empIdx !== -1 && typeof state.registeredUsers[empIdx] !== 'string') {
                        state.registeredUsers[empIdx].status = 'online';
                    }

                    this.save();
                    this.render();
                    alert("Job completed, cost breakdown saved, and invoice generated!");
                }
            },

            updateCompletedDate(id, date) {
                const docket = state.dockets.find(d => d.id === id);
                if (docket) {
                    docket.completedDate = date;
                    this.save();
                    this.render();
                }
            },

            updateExpectedDate(id, date) {
                const docket = state.dockets.find(d => d.id === id);
                if (docket) {
                    docket.expectedDate = date;
                    this.save();
                    this.render();
                }
            },

            render() {
                if (!state.currentUser) return;

                if (state.currentUser.role === 'customer') {
                    this.renderCustomerList();
                    this.renderCustomerComplaints();
                } else if (state.currentUser.role === 'admin') {
                    this.renderAdminList();
                    this.renderAdminComplaints();
                } else if (state.currentUser.role === 'employee') {
                    this.renderEmployeeList();
                }
            },

            renderCustomerList() {
                const list = document.getElementById('customer-dockets-list');
                const myDockets = state.dockets.filter(d => d.customer === state.currentUser.username);

                if (myDockets.length === 0) {
                    list.innerHTML = '<div class="empty-state">No requests found. Create one to get started!</div>';
                    return;
                }

                const getEmployeeDetails = (username) => {
                    const emp = state.registeredUsers.find(u => (typeof u === 'string' ? u : u.username) === username);
                    return {
                        name: emp && emp.name ? emp.name : username,
                        mobile: emp && emp.mobile ? emp.mobile : 'Not Provided'
                    };
                };

                list.innerHTML = myDockets.map(d => {
                    const emp = d.assignedTo ? getEmployeeDetails(d.assignedTo) : null;

                    // Chat section
                    let chatButtonHtml = '';
                    if (d.status === 'assigned') {
                        chatButtonHtml = `<button class="btn-small secondary" onclick="app.toggleChat('${d.id}')" style="margin-top: 8px;">Chat with Technician</button>`;
                    }

                    // Feedback section
                    let feedbackHtml = '';
                    if (d.status === 'completed') {
                        if (!d.rating) {
                            feedbackHtml = `
                                <div class="feedback-section" style="margin-top: 12px; padding: 12px; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
                                    <div style="font-weight: 600; font-size: 0.85rem; margin-bottom: 8px;">Rate this service:</div>
                                    <div style="display: flex; gap: 8px; margin-bottom: 8px; font-size: 1.3rem; color: #f59e0b; cursor: pointer;">
                                        <span onclick="app.setRating('${d.id}', 1)" id="star-${d.id}-1">★</span>
                                        <span onclick="app.setRating('${d.id}', 2)" id="star-${d.id}-2">★</span>
                                        <span onclick="app.setRating('${d.id}', 3)" id="star-${d.id}-3">★</span>
                                        <span onclick="app.setRating('${d.id}', 4)" id="star-${d.id}-4">★</span>
                                        <span onclick="app.setRating('${d.id}', 5)" id="star-${d.id}-5">★</span>
                                    </div>
                                    <textarea id="review-${d.id}" placeholder="Write a short review..." rows="2" style="font-size: 0.85rem; padding: 8px; margin-bottom: 8px;"></textarea>
                                    <button class="btn-small" onclick="app.submitFeedback('${d.id}')" style="padding: 6px 12px; width: auto;">Submit Review</button>
                                </div>
                            `;
                            // Color 5 stars gold as default
                            setTimeout(() => app.setRating(d.id, 5), 10);
                        } else {
                            feedbackHtml = `
                                <div style="margin-top: 12px; padding: 12px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; font-size: 0.9rem;">
                                    <div style="font-weight: 600; color: #f59e0b;">Your Rating: ${'★'.repeat(d.rating)}${'☆'.repeat(5 - d.rating)}</div>
                                    ${d.review ? `<div class="docket-details" style="margin-top: 4px; font-style: italic;">"${d.review}"</div>` : ''}
                                </div>
                            `;
                        }
                    }

                    // Invoice & Payment buttons
                    let invoiceButtonHtml = '';
                    let payButtonHtml = '';
                    if (d.status === 'completed') {
                        invoiceButtonHtml = `<button class="btn-small secondary" onclick="app.openInvoiceModal('${d.id}')" style="margin-top: 8px;">View Invoice</button>`;

                        if (!d.isPaid) {
                            payButtonHtml = `<button class="btn-small" onclick="app.openPaymentModal('${d.id}')" style="margin-top: 8px; background: #10b981; color: white; border: none;">💳 Pay ₹${d.amountReceived || d.serviceFee || 0} Online</button>`;
                        } else {
                            payButtonHtml = `<div class="badge completed" style="margin-top: 10px; font-size: 0.85rem;">Payment Successful</div>`;
                        }
                    }

                    return `
                    <div class="list-item">
                        <div style="font-weight: 600;">${d.title} <span class="badge ${d.status}">${d.status.toUpperCase()}</span></div>
                        <div class="docket-details">Type: ${d.type} | Submitted: ${d.date}</div>
                        <div class="docket-details">Preferred Date: ${d.preferredDate || 'N/A'}</div>
                        ${d.location ? `<div class="docket-details" style="color: var(--success); font-weight: 500;"><span style="color: #10b981;">📍</span> GPS Location Shared</div>` : ''}
                        ${emp ? `<div class="docket-details" style="color: #818cf8;">Assigned to: ${emp.name} (Mobile: ${emp.mobile})</div>` : ''}
                        ${d.expectedDate ? `<div class="docket-details" style="color: var(--warning); font-weight: 600;">Expected Completion: ${d.expectedDate}</div>` : ''}
                        ${d.completedDate ? `<div class="docket-details" style="color: var(--success); font-weight: 600;">Completed On: ${d.completedDate}</div>` : ''}
                        ${d.status === 'rejected' && d.rejectionReason ? `<div class="docket-details" style="color: #ef4444; font-weight: 600; padding: 8px; background: rgba(239, 68, 68, 0.1); border-radius: 4px; margin-top: 8px;">Reason for rejection: ${d.rejectionReason}</div>` : ''}
                        
                        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                            ${d.status === 'pending' ? `<button class="btn-small" onclick="app.rejectDocket('${d.id}', true)" style="background: #ef4444; color: white; border: none; margin-top: 8px; width: auto; font-weight: 600;">Cancel Request</button>` : ''}
                            ${chatButtonHtml}
                            ${invoiceButtonHtml}
                            ${payButtonHtml}
                        </div>

                        ${this.getChatHtml(d)}
                        ${feedbackHtml}
                    </div>
                    `;
                }).join('');
            },

            renderCustomerComplaints() {
                const list = document.getElementById('customer-complaints-list');
                if (!list) return;

                const myComplaints = state.complaints.filter(c => c.customer === state.currentUser.username);

                if (myComplaints.length === 0) {
                    list.innerHTML = '<div class="empty-state">No complaints filed.</div>';
                    return;
                }

                list.innerHTML = myComplaints.map(c => `
                    <div class="list-item">
                        <div style="font-weight: 600;">${c.title} <span class="badge ${c.status === 'resolved' ? 'completed' : 'pending'}">${c.status.toUpperCase()}</span></div>
                        <div class="docket-details">Submitted: ${c.date}</div>
                        <div class="docket-details">Details: ${c.desc}</div>
                    </div>
                `).join('');
            },

            calculateHaversineDistance(lat1, lon1, lat2, lon2) {
                const R = 6371; // Radius of the earth in km
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c; // Distance in km
            },

            getEmployees() {
                // Get employees from registered users
                const registered = state.registeredUsers.filter(u => u.role === 'employee');

                // Inject random location offsets for registered employees to simulate live field locations if they don't have one
                registered.forEach(emp => {
                    if (!emp.location && emp.status !== 'offline') {
                        // Mock near Kolkata
                        emp.location = {
                            lat: 22.5726 + (Math.random() - 0.5) * 0.1,
                            lng: 88.3639 + (Math.random() - 0.5) * 0.1
                        };
                    }
                });

                // Ensure demo employees are always available for assignment testing with mock GPS
                const demoEmps = [
                    { username: 'emp1', name: 'Demo Emp 1', specialty: 'General', location: { lat: 22.5800, lng: 88.3700 } },
                    { username: 'emp2', name: 'Demo Emp 2', specialty: 'General', location: { lat: 22.5600, lng: 88.3500 } }
                ];
                const allEmps = [...demoEmps, ...registered];
                // Deduplicate by username so we don't list a demo emp twice if they are saved in state
                return Array.from(new Map(allEmps.map(e => [e.username, e])).values());
            },

            handleNewUserRoleChange() {
                const role = document.getElementById('new-user-role').value;
                document.getElementById('new-user-email').style.display = role === 'customer' ? 'block' : 'none';
                document.getElementById('new-user-address').style.display = role === 'customer' ? 'block' : 'none';
                document.getElementById('new-user-specialty').style.display = role === 'employee' ? 'block' : 'none';
            },

            createUser(e) {
                e.preventDefault();
                const username = document.getElementById('new-user-username').value;
                const role = document.getElementById('new-user-role').value;

                const existingUsernames = state.registeredUsers.map(u => typeof u === 'string' ? u : u.username);
                if (existingUsernames.includes(username) || ['admin', 'emp1', 'emp2', 'cust1', 'cust2'].includes(username)) {
                    alert("Username already exists!");
                    return;
                }

                const newUser = {
                    username,
                    role: role,
                    password: document.getElementById('new-user-password').value,
                    name: document.getElementById('new-user-name').value,
                    mobile: document.getElementById('new-user-mobile').value,
                    email: document.getElementById('new-user-email').value,
                    address: document.getElementById('new-user-address').value,
                    specialty: document.getElementById('new-user-specialty').value
                };

                state.registeredUsers.push(newUser);
                this.save();
                this.render();
                e.target.reset();
                this.handleNewUserRoleChange(); // reset fields visibility
                alert("User created successfully!");
            },

            renderAnalytics() {
                const donutContainer = document.getElementById('analytics-donut-chart');
                const leaderboardContainer = document.getElementById('analytics-leaderboard');
                if (!donutContainer || !leaderboardContainer) return;

                // 1. Service Type Donut Chart
                const types = {};
                let totalDockets = 0;
                state.dockets.forEach(d => {
                    const t = d.type || 'repair';
                    types[t] = (types[t] || 0) + 1;
                    totalDockets++;
                });

                if (totalDockets === 0) {
                    donutContainer.innerHTML = '<div class="empty-state">No data available</div>';
                    leaderboardContainer.innerHTML = '<div class="empty-state">No data available</div>';
                    return;
                }

                // Simple 2-slice donut: repair vs installation
                const repairCount = types['repair'] || 0;
                const instCount = types['installation'] || 0;
                const repairPct = totalDockets ? (repairCount / totalDockets) * 100 : 0;

                // SVG Circle Math
                const radius = 60;
                const circumference = 2 * Math.PI * radius;
                const repairDash = (repairPct / 100) * circumference;

                donutContainer.innerHTML = `
                    <div style="position: relative; width: 200px; height: 200px; display: flex; flex-direction: column; align-items: center;">
                        <svg width="200" height="200" viewBox="0 0 160 160" style="transform: rotate(-90deg);">
                            <circle cx="80" cy="80" r="${radius}" fill="none" stroke="#818cf8" stroke-width="20" />
                            <circle cx="80" cy="80" r="${radius}" fill="none" stroke="#f59e0b" stroke-width="20" 
                                stroke-dasharray="${repairDash} ${circumference}" 
                                style="transition: stroke-dasharray 1s ease-in-out;" />
                        </svg>
                        <div style="position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white;">
                            <div style="font-size: 1.5rem; font-weight: 700;">${totalDockets}</div>
                            <div style="font-size: 0.7rem; color: var(--text-muted);">Total Jobs</div>
                        </div>
                        <div style="display: flex; gap: 16px; margin-top: -10px; width: 100%; justify-content: center;">
                            <div style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem;"><span style="display:inline-block; width:12px; height:12px; background:#f59e0b; border-radius:2px;"></span> Repair (${repairCount})</div>
                            <div style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem;"><span style="display:inline-block; width:12px; height:12px; background:#818cf8; border-radius:2px;"></span> Install (${instCount})</div>
                        </div>
                    </div>
                `;

                // 2. Leaderboard
                const empStats = {};
                state.dockets.forEach(d => {
                    if (d.status === 'completed' && d.assignedTo) {
                        if (!empStats[d.assignedTo]) empStats[d.assignedTo] = { jobs: 0, revenue: 0, rating: 0, ratingCount: 0 };
                        empStats[d.assignedTo].jobs++;
                        empStats[d.assignedTo].revenue += (d.amountReceived || 0);
                        if (d.rating) {
                            empStats[d.assignedTo].rating += d.rating;
                            empStats[d.assignedTo].ratingCount++;
                        }
                    }
                });

                const leaderboard = Object.keys(empStats).map(emp => {
                    const stats = empStats[emp];
                    const avgRating = stats.ratingCount > 0 ? (stats.rating / stats.ratingCount).toFixed(1) : 'N/A';
                    return { emp, ...stats, avgRating };
                }).sort((a, b) => b.jobs - a.jobs).slice(0, 5);

                if (leaderboard.length === 0) {
                    leaderboardContainer.innerHTML = '<div class="empty-state">No completed jobs yet.</div>';
                    return;
                }

                leaderboardContainer.innerHTML = leaderboard.map((stat, i) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--surface-border);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 24px; height: 24px; background: rgba(255,255,255,0.1); border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: 700; font-size: 0.8rem; color: ${i === 0 ? '#fbbf24' : 'var(--text-muted)'};">
                                ${i + 1}
                            </div>
                            <div>
                                <div style="font-weight: 600;">${stat.emp}</div>
                                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">★ ${stat.avgRating} Avg Rating</div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 600; color: var(--success);">${stat.jobs} Jobs</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">₹${stat.revenue} Earned</div>
                        </div>
                    </div>
                `).join('');
            },

            renderAdminList() {
                const list = document.getElementById('admin-dockets-list');
                const employees = this.getEmployees();
                const customers = this.getCustomers();

                this.renderEmployeeDirectory(employees);
                this.renderCustomerDirectory(customers);

                // Populate report filter employees dropdown
                const reportFilterEmp = document.getElementById('report-filter-employee');
                if (reportFilterEmp) {
                    const currentSelection = reportFilterEmp.value;
                    reportFilterEmp.innerHTML = '<option value="all">All Employees</option>' +
                        employees.map(emp => `<option value="${emp.username}">${emp.name || emp.username}</option>`).join('');
                    reportFilterEmp.value = currentSelection || 'all';
                }

                this.renderReport();
                this.renderAnalytics();

                if (state.dockets.length === 0) {
                    list.innerHTML = '<div class="empty-state">No service requests in the system.</div>';
                    return;
                }

                const getCustomerDetails = (username) => {
                    const cust = state.registeredUsers.find(u => (typeof u === 'string' ? u : u.username) === username);
                    return {
                        name: cust && cust.name ? cust.name : username,
                        mobile: cust && cust.mobile ? cust.mobile : 'Not Provided'
                    };
                };

                const employeeOptions = employees.map(emp => `<option value="${emp.username}">${emp.name || emp.username} ${emp.specialty ? '(' + emp.specialty + ')' : ''}</option>`).join('');

                list.innerHTML = state.dockets.map(d => {
                    const cust = getCustomerDetails(d.customer);

                    let sortedEmployees = [...employees];
                    let closestEmp = null;
                    if (d.location) {
                        sortedEmployees = sortedEmployees.map(emp => {
                            if (emp.location && emp.status !== 'offline') {
                                const dist = app.calculateHaversineDistance(d.location.lat, d.location.lng, emp.location.lat, emp.location.lng);
                                return { ...emp, distance: dist };
                            }
                            return { ...emp, distance: Infinity };
                        }).sort((a, b) => a.distance - b.distance);
                        if (sortedEmployees[0] && sortedEmployees[0].distance !== Infinity) {
                            closestEmp = sortedEmployees[0].username;
                        }
                    }

                    // Admin Chat Inspector Button
                    let chatButtonHtml = '';
                    if (d.status === 'assigned' || d.status === 'completed') {
                        chatButtonHtml = `<button class="btn-small secondary" onclick="app.toggleChat('${d.id}')" style="margin-top: 8px; width: auto; padding: 6px 12px;">Inspect Chat</button>`;
                    }

                    // Admin Invoice view
                    let invoiceButtonHtml = '';
                    if (d.status === 'completed') {
                        invoiceButtonHtml = `<button class="btn-small secondary" onclick="app.openInvoiceModal('${d.id}')" style="margin-top: 8px; width: auto; padding: 6px 12px; margin-left: 8px;">View Invoice</button>`;
                    }

                    return `
                    <div class="list-item">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
                            <div style="flex: 1; min-width: 250px;">
                                <div style="font-weight: 600;">${d.title} <span class="badge ${d.status}">${d.status.toUpperCase()}</span></div>
                                <div class="docket-details">Customer: ${cust.name} | Mobile: ${cust.mobile}</div>
                                <div class="docket-details">Work Type: ${d.type} | Address: ${d.address}</div>
                                <div class="docket-details">Preferred Date: ${d.preferredDate || 'N/A'}</div>
                                ${d.location ? `
                                <div class="docket-details" style="display: flex; align-items: center; gap: 6px; color: var(--success); font-weight: 500;">
                                    <span>📍</span> Location Shared: 
                                    <a href="https://www.google.com/maps?q=${d.location.lat},${d.location.lng}" target="_blank" style="color: #818cf8; text-decoration: underline; font-weight: 600;">
                                        View on Google Maps (${d.location.lat.toFixed(5)}, ${d.location.lng.toFixed(5)})
                                    </a>
                                </div>
                                ` : ''}
                                <div class="docket-details">Details: ${d.desc}</div>
                                ${d.status === 'rejected' && d.rejectionReason ? `<div class="docket-details" style="color: #ef4444; font-weight: 600; padding: 8px; background: rgba(239, 68, 68, 0.1); border-radius: 4px; margin-top: 8px;">Reason for rejection: ${d.rejectionReason}</div>` : ''}
                                ${d.expectedDate ? `<div class="docket-details" style="color: var(--warning); font-weight: 600;">Expected Completion: ${d.expectedDate}</div>` : ''}
                                ${d.completedDate ? `<div class="docket-details" style="color: var(--success); font-weight: 600;">Completed On: ${d.completedDate}</div>` : ''}
                                
                                ${d.rating ? `
                                    <div style="margin-top: 8px; font-size: 0.9rem; color: #f59e0b; font-weight: 600;">
                                        Rating: ${'★'.repeat(d.rating)}${'☆'.repeat(5 - d.rating)}
                                        ${d.review ? `<span style="font-weight: normal; font-style: italic; color: var(--text-muted); margin-left: 6px;">"${d.review}"</span>` : ''}
                                    </div>
                                ` : ''}

                                <div style="display: flex; gap: 8px;">
                                    ${chatButtonHtml}
                                    ${invoiceButtonHtml}
                                </div>
                            </div>
                            <div style="min-width: 200px; text-align: right;">
                                ${d.status === 'pending' || d.status === 'assigned' ? `
                                    <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: flex-start; margin-bottom: ${d.status === 'assigned' ? '8px' : '0'}; flex-wrap: wrap; direction: rtl;">
                                        <select onchange="app.assignDocket('${d.id}', this.value)" style="margin-bottom: 0; text-align-last: right; direction: rtl; min-width: 220px;">
                                            <option value="">${d.status === 'pending' ? 'Assign to...' : 'Re-assign...'}</option>
                                            ${sortedEmployees.map(emp => {
                        const isOnline = emp.status !== 'offline';
                        const statusSymbol = isOnline ? '🟢' : '🔴';
                        const statusText = isOnline ? 'Online' : 'Offline';
                        let distText = '';
                        if (emp.distance && emp.distance !== Infinity) {
                            distText = ` | ${emp.distance.toFixed(1)} km`;
                        }
                        const recommended = closestEmp === emp.username ? ' ⭐ RECOMMENDED' : '';
                        return `<option value="${emp.username}" ${d.assignedTo === emp.username ? 'selected' : ''}>${statusSymbol} ${emp.name || emp.username} (${statusText})${distText}${recommended}</option>`;
                    }).join('')}
                                        </select>
                                        ${closestEmp && d.status === 'pending' ? `
                                            <button class="btn-small" onclick="app.assignDocket('${d.id}', '${closestEmp}')" style="background: var(--warning); color: #1e293b; width: auto; font-weight: 700; font-size: 0.8rem; padding: 10px 14px; margin-bottom: 0;">Auto-Assign Closest</button>
                                        ` : ''}
                                        ${d.status === 'pending' ? `
                                            <button class="btn-small" onclick="app.rejectDocket('${d.id}')" style="background: #ef4444; color: white; width: auto; font-weight: 700; font-size: 0.8rem; padding: 10px 14px; margin-bottom: 0; border: none;">Reject</button>
                                        ` : ''}
                                    </div>
                                    ${d.status === 'assigned' ? `<div class="badge assigned" style="margin-left: 0; display: block; text-align: center; margin-bottom: 8px;">Assigned to: ${d.assignedTo}</div>` : ''}
                                    <div style="margin-top: 4px; display: flex; gap: 8px; align-items: flex-end; justify-content: flex-end;">
                                        <div style="text-align: left;">
                                            <label style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 4px;">Expected Completion:</label>
                                            <input type="date" id="exp-date-${d.id}" value="${d.expectedDate || ''}" style="padding: 6px; margin-bottom: 0; background: rgba(15, 23, 42, 0.9); width: 140px;">
                                        </div>
                                        <button class="btn-small secondary" onclick="app.updateExpectedDate('${d.id}', document.getElementById('exp-date-${d.id}').value)">Save</button>
                                    </div>
                                ` : ''}
                                ${d.status === 'completed' ? `
                                    <div class="docket-details" style="color: var(--success); font-weight: 600; text-align: right; margin-bottom: 8px; font-size: 0.95rem;">
                                        Received: ₹${d.amountReceived || 0} (${d.paymentMethod || 'Cash'})
                                        <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal; margin-top: 2px;">
                                            (Service: ₹${d.serviceFee || d.amountReceived || 0} | Materials: ₹${d.materialCosts || 0})
                                        </div>
                                    </div>
                                    <div style="margin-top: 4px; display: flex; gap: 8px; align-items: flex-end; justify-content: flex-end;">
                                        <div style="text-align: left;">
                                            <label style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 4px;">Completed Date:</label>
                                            <input type="date" id="comp-date-${d.id}" value="${d.completedDate || ''}" style="padding: 6px; margin-bottom: 0; background: rgba(15, 23, 42, 0.9); width: 140px;">
                                        </div>
                                        <button class="btn-small secondary" onclick="app.updateCompletedDate('${d.id}', document.getElementById('comp-date-${d.id}').value)">Save</button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        ${this.getChatHtml(d)}
                    </div>
                    `;
                }).join('');

                // Redraw map markers
                this.renderAdminMap();
            },

            renderReport() {
                const filterEmp = document.getElementById('report-filter-employee').value;
                const filterDate = document.getElementById('report-filter-date').value;
                const reportList = document.getElementById('report-list');

                if (!reportList) return;

                // Get all completed dockets
                let dockets = state.dockets.filter(d => d.status === 'completed');

                // Apply filters
                if (filterEmp !== 'all') {
                    dockets = dockets.filter(d => d.assignedTo === filterEmp);
                }
                if (filterDate) {
                    dockets = dockets.filter(d => d.completedDate === filterDate);
                }

                // Sort by completedDate descending
                dockets.sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate));

                if (dockets.length === 0) {
                    reportList.innerHTML = '<div class="empty-state">No payment details found for the selected filters.</div>';
                    return;
                }

                let totalCash = 0;
                let totalPhonePe = 0;
                let totalDue = 0;
                let totalAmount = 0;

                const getEmployeeName = (username) => {
                    const emp = state.registeredUsers.find(u => (typeof u === 'string' ? u : u.username) === username);
                    return emp && emp.name ? emp.name : username;
                };

                const getCustomerName = (username) => {
                    const cust = state.registeredUsers.find(u => (typeof u === 'string' ? u : u.username) === username);
                    return cust && cust.name ? cust.name : username;
                };

                const rowsHtml = dockets.map(d => {
                    const amt = d.amountReceived || 0;
                    const method = d.paymentMethod || 'Cash';
                    if (method === 'Cash') totalCash += amt;
                    else if (method === 'PhonePe') totalPhonePe += amt;
                    else if (method === 'Due') totalDue += amt;
                    totalAmount += amt;

                    return `
                        <tr>
                            <td style="padding: 12px; border-bottom: 1px solid var(--surface-border);">${d.completedDate || 'N/A'}</td>
                            <td style="padding: 12px; border-bottom: 1px solid var(--surface-border);">${getEmployeeName(d.assignedTo)}</td>
                            <td style="padding: 12px; border-bottom: 1px solid var(--surface-border);">${getCustomerName(d.customer)}</td>
                            <td style="padding: 12px; border-bottom: 1px solid var(--surface-border);">${d.title}</td>
                            <td style="padding: 12px; border-bottom: 1px solid var(--surface-border);">
                                <div style="font-weight: 600;">₹${amt}</div>
                                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal; white-space: nowrap;">
                                    (Fee: ₹${d.serviceFee || amt} | Mat: ₹${d.materialCosts || 0})
                                </div>
                            </td>
                            <td style="padding: 12px; border-bottom: 1px solid var(--surface-border);">
                                <span class="badge ${method === 'Due' ? 'pending' : 'completed'}">${method}</span>
                            </td>
                        </tr>
                    `;
                }).join('');

                reportList.innerHTML = `
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.95rem;">
                        <thead>
                            <tr style="background: rgba(255,255,255,0.05);">
                                <th style="padding: 12px; border-bottom: 1px solid var(--surface-border);">Completion Date</th>
                                <th style="padding: 12px; border-bottom: 1px solid var(--surface-border);">Employee</th>
                                <th style="padding: 12px; border-bottom: 1px solid var(--surface-border);">Customer</th>
                                <th style="padding: 12px; border-bottom: 1px solid var(--surface-border);">Task Title</th>
                                <th style="padding: 12px; border-bottom: 1px solid var(--surface-border);">Amount</th>
                                <th style="padding: 12px; border-bottom: 1px solid var(--surface-border);">Method</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                    <div style="margin-top: 20px; padding: 16px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; display: flex; justify-content: space-around; flex-wrap: wrap; gap: 16px; font-weight: 600;">
                        <div>Total Cash: <span style="color: var(--success);">₹${totalCash}</span></div>
                        <div>Total PhonePe: <span style="color: #c084fc;">₹${totalPhonePe}</span></div>
                        <div>Total Due: <span style="color: var(--warning);">₹${totalDue}</span></div>
                        <div style="border-left: 1px solid var(--surface-border); padding-left: 20px;">Grand Total: <span style="color: #818cf8; font-size: 1.1rem;">₹${totalAmount}</span></div>
                    </div>
                `;
            },

            clearReportFilters() {
                document.getElementById('report-filter-employee').value = 'all';
                document.getElementById('report-filter-date').value = '';
                this.renderReport();
            },

            getEmployeeRatingStats(username) {
                const completedJobs = state.dockets.filter(d => d.assignedTo === username && d.status === 'completed' && d.rating);
                if (completedJobs.length === 0) {
                    return { average: 0, reviewsCount: 0, starsString: 'No reviews yet' };
                }
                const sum = completedJobs.reduce((acc, job) => acc + job.rating, 0);
                const average = (sum / completedJobs.length).toFixed(1);
                return {
                    average: parseFloat(average),
                    reviewsCount: completedJobs.length,
                    starsString: `★ ${average} (${completedJobs.length} review${completedJobs.length > 1 ? 's' : ''})`
                };
            },

            renderEmployeeDirectory(employees) {
                const list = document.getElementById('admin-employee-list');
                if (employees.length === 0) {
                    list.innerHTML = '<div class="empty-state">No employees found.</div>';
                    return;
                }
                list.innerHTML = employees.map(emp => {
                    const stats = this.getEmployeeRatingStats(emp.username);
                    const isOnline = emp.status !== 'offline';
                    const statusSymbol = isOnline ? '🟢' : '🔴';
                    const statusText = isOnline ? 'Duty On' : 'Duty Off';
                    return `
                    <div class="list-item" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                        <div>
                            <div style="font-weight: 600; display: flex; align-items: center; gap: 8px;">
                                <span>${emp.name || emp.username}</span>
                                <span class="badge completed" style="background: ${isOnline ? 'rgba(22, 163, 74, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${isOnline ? '#22c55e' : '#ef4444'};">
                                    ${statusSymbol} ${statusText}
                                </span>
                            </div>
                            <div class="docket-details">Username: ${emp.username}</div>
                            ${emp.mobile ? `<div class="docket-details">Mobile: ${emp.mobile}</div>` : ''}
                            ${emp.specialty ? `<div class="docket-details">Specialty: ${emp.specialty}</div>` : ''}
                            <div class="docket-details" style="color: #f59e0b; font-weight: 600; margin-top: 4px;">${stats.starsString}</div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn-small secondary" onclick="app.openEditModal('${emp.username}')">Edit</button>
                            <button class="btn-small" style="background: var(--warning);" onclick="app.deleteUser('${emp.username}')">Delete</button>
                        </div>
                    </div>
                    `;
                }).join('');
            },
            getCustomers() {
                const registered = state.registeredUsers.filter(u => u.role === 'customer');
                const demoCusts = [
                    { username: 'cust1', name: 'Demo Customer 1' },
                    { username: 'cust2', name: 'Demo Customer 2' }
                ];
                const allCusts = [...demoCusts, ...registered];
                return Array.from(new Map(allCusts.map(c => [c.username, c])).values());
            },

            renderCustomerDirectory(customers) {
                const list = document.getElementById('admin-customer-list');
                if (!list) return; // guard against missing element
                if (customers.length === 0) {
                    list.innerHTML = '<div class="empty-state">No customers found.</div>';
                    return;
                }
                list.innerHTML = customers.map(cust => `
                    <div class="list-item" style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 600;">${cust.name || cust.username} <span class="badge pending">Customer</span></div>
                            <div class="docket-details">Username: ${cust.username}</div>
                            ${cust.mobile ? `<div class="docket-details">Mobile: ${cust.mobile}</div>` : ''}
                            ${cust.email ? `<div class="docket-details">Email: ${cust.email}</div>` : ''}
                            ${cust.address ? `<div class="docket-details">Address: ${cust.address}</div>` : ''}
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn-small secondary" style="background: var(--primary);" onclick="app.viewCustomerHistory('${cust.username}')">History</button>
                            <button class="btn-small secondary" onclick="app.openEditModal('${cust.username}')">Edit</button>
                            <button class="btn-small" style="background: var(--warning);" onclick="app.deleteUser('${cust.username}')">Delete</button>
                        </div>
                    </div>
                `).join('');
            },

            renderAdminComplaints() {
                const list = document.getElementById('admin-complaints-list');
                if (!list) return;

                if (state.complaints.length === 0) {
                    list.innerHTML = '<div class="empty-state">No complaints logged in the system.</div>';
                    return;
                }

                const getCustomerDetails = (username) => {
                    const cust = state.registeredUsers.find(u => (typeof u === 'string' ? u : u.username) === username);
                    return {
                        name: cust && cust.name ? cust.name : username,
                        mobile: cust && cust.mobile ? cust.mobile : 'Not Provided'
                    };
                };

                list.innerHTML = state.complaints.map(c => {
                    const cust = getCustomerDetails(c.customer);
                    return `
                        <div class="list-item" style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <div style="font-weight: 600;">${c.title} <span class="badge ${c.status === 'resolved' ? 'completed' : 'pending'}">${c.status.toUpperCase()}</span></div>
                                <div class="docket-details">Customer: ${cust.name} | Mobile: ${cust.mobile}</div>
                                <div class="docket-details">Submitted: ${c.date}</div>
                                <div class="docket-details" style="margin-top: 6px;">Details: ${c.desc}</div>
                            </div>
                            <div>
                                ${c.status === 'pending' ? `
                                    <button class="btn-small" style="background: var(--success); color: white;" onclick="app.resolveComplaint('${c.id}')">Mark as Resolved</button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
            },

            resolveComplaint(id) {
                const comp = state.complaints.find(c => c.id === id);
                if (comp) {
                    comp.status = 'resolved';
                    this.save();
                    this.render();
                    alert("Complaint resolved successfully!");
                }
            },

            openEditModal(username) {
                const allUsers = [...this.getEmployees(), ...this.getCustomers()];
                const user = allUsers.find(u => u.username === username);
                if (!user) return;

                document.getElementById('edit-original-username').value = user.username;
                document.getElementById('edit-username').value = user.username;
                document.getElementById('edit-role').value = user.role || (this.getEmployees().find(e => e.username === username) ? 'employee' : 'customer');
                document.getElementById('edit-name').value = user.name || '';
                document.getElementById('edit-mobile').value = user.mobile || '';
                document.getElementById('edit-email').value = user.email || '';
                document.getElementById('edit-address').value = user.address || '';
                document.getElementById('edit-specialty').value = user.specialty || '';
                document.getElementById('edit-password').value = '';

                // Show/hide role specific fields
                const role = document.getElementById('edit-role').value;
                document.getElementById('edit-email').style.display = role === 'customer' ? 'block' : 'none';
                document.getElementById('edit-address').style.display = role === 'customer' ? 'block' : 'none';
                document.getElementById('edit-specialty').style.display = role === 'employee' ? 'block' : 'none';

                document.getElementById('edit-user-modal').classList.add('active');
            },

            closeEditModal() {
                document.getElementById('edit-user-modal').classList.remove('active');
            },

            viewCustomerHistory(username) {
                const modal = document.getElementById('history-modal');
                const title = document.getElementById('history-modal-title');
                const list = document.getElementById('history-modal-list');

                title.textContent = `Job History for ${username}`;

                const customerJobs = state.dockets.filter(d => d.customer === username);

                if (customerJobs.length === 0) {
                    list.innerHTML = '<div class="empty-state" style="padding: 20px;">No job history found.</div>';
                } else {
                    list.innerHTML = customerJobs.map(d => `
                        <div class="list-item">
                                <div style="font-weight: 600;">${d.title} <span class="badge ${d.status}">${d.status.toUpperCase()}</span></div>
                                <div class="docket-details">Type: ${d.type} | Submitted: ${d.date}</div>
                                <div class="docket-details">Preferred Date: ${d.preferredDate || 'N/A'}</div>
                                <div class="docket-details">Address: ${d.address}</div>
                                ${d.location ? `
                                <div class="docket-details" style="display: flex; align-items: center; gap: 6px; color: var(--success); font-weight: 500;">
                                    <span>📍</span> Location: 
                                    <a href="https://www.google.com/maps?q=${d.location.lat},${d.location.lng}" target="_blank" style="color: #818cf8; text-decoration: underline; font-weight: 600;">
                                        View on Google Maps (${d.location.lat.toFixed(5)}, ${d.location.lng.toFixed(5)})
                                    </a>
                                </div>
                                ` : ''}
                                <div class="docket-details">Task: ${d.desc}</div>
                                ${d.assignedTo ? `<div class="docket-details" style="color: #818cf8;">Assigned to: ${d.assignedTo}</div>` : ''}
                        </div>
                    `).join('');
                }

                modal.classList.add('active');
            },

            closeHistoryModal() {
                document.getElementById('history-modal').classList.remove('active');
            },

            saveUserEdit(e) {
                e.preventDefault();
                const username = document.getElementById('edit-original-username').value;
                const userIndex = state.registeredUsers.findIndex(u => (typeof u === 'string' ? u : u.username) === username);

                if (userIndex === -1) {
                    // For demo users that aren't in registeredUsers yet, add them
                    const role = document.getElementById('edit-role').value;
                    state.registeredUsers.push({ username, role });
                }

                const realIndex = state.registeredUsers.findIndex(u => (typeof u === 'string' ? u : u.username) === username);
                const userObj = state.registeredUsers[realIndex];

                // Convert to object if it was a string
                if (typeof userObj === 'string') {
                    state.registeredUsers[realIndex] = { username: userObj, role: document.getElementById('edit-role').value };
                }

                const updatedUser = state.registeredUsers[realIndex];
                updatedUser.name = document.getElementById('edit-name').value;
                updatedUser.mobile = document.getElementById('edit-mobile').value;
                updatedUser.email = document.getElementById('edit-email').value;
                updatedUser.address = document.getElementById('edit-address').value;
                updatedUser.specialty = document.getElementById('edit-specialty').value;

                const newPassword = document.getElementById('edit-password').value;
                if (newPassword) {
                    updatedUser.password = newPassword;
                }

                this.save();
                this.render();
                this.closeEditModal();
                alert("User updated successfully!");
            },

            deleteUser(username) {
                if (confirm(`Are you sure you want to delete user: ${username}?`)) {
                    state.registeredUsers = state.registeredUsers.filter(u => {
                        const uName = typeof u === 'string' ? u : u.username;
                        return uName !== username;
                    });

                    // Note: In a real app we might want to clean up their dockets or re-assign them, 
                    // but for this demo, just deleting the user profile is fine.
                    this.save();
                    this.render();
                }
            },

            renderEmployeeList() {
                const activeList = document.getElementById('employee-active-jobs');
                const historyList = document.getElementById('employee-history-jobs');

                // Sync Duty status dropdown selector
                const empUser = state.registeredUsers.find(u => (typeof u === 'string' ? u : u.username) === state.currentUser.username);
                const dutySelect = document.getElementById('employee-duty-status');
                if (dutySelect && empUser) {
                    dutySelect.value = empUser.status || 'online';
                }

                const activeJobs = state.dockets.filter(d => d.assignedTo === state.currentUser.username && d.status === 'assigned');
                const completedJobs = state.dockets.filter(d => d.assignedTo === state.currentUser.username && d.status === 'completed');

                const getCustomerDetails = (username) => {
                    const cust = state.registeredUsers.find(u => (typeof u === 'string' ? u : u.username) === username);
                    return {
                        name: cust && cust.name ? cust.name : username,
                        mobile: cust && cust.mobile ? cust.mobile : 'Not Provided'
                    };
                };

                if (activeJobs.length === 0) {
                    activeList.innerHTML = '<div class="empty-state">No active jobs assigned to you right now.</div>';
                } else {
                    activeList.innerHTML = activeJobs.map(d => {
                        const cust = getCustomerDetails(d.customer);
                        return `
                        <div class="list-item">
                            <div style="font-weight: 600;">${d.title} <span class="badge ${d.status}">${d.status.toUpperCase()}</span></div>
                            <div class="docket-details">Customer: ${cust.name}</div>
                            <div class="docket-details">Mobile: ${cust.mobile}</div>
                            <div class="docket-details">Work Type: ${d.type}</div>
                            <div class="docket-details">Address: ${d.address}</div>
                            <div class="docket-details">Preferred Date: ${d.preferredDate || 'N/A'}</div>
                            ${d.location ? `
                            <div class="docket-details" style="margin-top: 4px; margin-bottom: 8px;">
                                <a href="https://www.google.com/maps?q=${d.location.lat},${d.location.lng}" target="_blank" class="btn-small" style="background: var(--success); color: white; display: inline-flex; align-items: center; gap: 6px; text-decoration: none; width: auto; font-size: 0.85rem; padding: 6px 12px; border-radius: 6px; font-weight: 600;">
                                    <span>📍</span> View Customer Location on Google Map
                                </a>
                            </div>
                            ` : ''}
                            <div class="docket-details">Details: ${d.desc}</div>
                            ${d.expectedDate ? `<div class="docket-details" style="color: var(--warning); font-weight: 600;">Expected Completion: ${d.expectedDate}</div>` : ''}
                            
                            <div class="docket-actions" style="margin-top: 12px; flex-wrap: wrap;">
                                ${state.docketBeingCompleted === d.id ? `
                                    <div class="completion-form" style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; width: 100%;">
                                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                            <div style="flex: 1; min-width: 120px;">
                                                <label style="font-size: 0.8rem; display:block; margin-bottom:4px; color: var(--text-muted);">Service Fee (₹):</label>
                                                <input type="number" id="service-fee-${d.id}" placeholder="e.g. 500" style="padding: 6px; margin-bottom: 0; background: rgba(15, 23, 42, 0.9);" required min="0">
                                            </div>
                                            <div style="flex: 1; min-width: 120px;">
                                                <label style="font-size: 0.8rem; display:block; margin-bottom:4px; color: var(--text-muted);">Material Costs (₹):</label>
                                                <input type="number" id="material-cost-${d.id}" placeholder="e.g. 200" style="padding: 6px; margin-bottom: 0; background: rgba(15, 23, 42, 0.9);" min="0" value="0">
                                            </div>
                                            <div style="flex: 1; min-width: 120px;">
                                                <label style="font-size: 0.8rem; display:block; margin-bottom:4px; color: var(--text-muted);">Payment Method:</label>
                                                <select id="pay-${d.id}" style="padding: 6px; margin-bottom: 0; background: rgba(15, 23, 42, 0.9);">
                                                    <option value="Cash">Cash</option>
                                                    <option value="PhonePe">PhonePe</option>
                                                    <option value="Due">Due</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div style="display: flex; gap: 8px; margin-top: 4px;">
                                            <button class="btn-small" onclick="app.submitCompletion('${d.id}')" style="flex: 1;">Submit</button>
                                            <button class="btn-small secondary" onclick="app.cancelCompletion()" style="flex: 1; padding: 8px;">Cancel</button>
                                        </div>
                                    </div>
                                ` : `
                                    <button class="btn-small" onclick="app.startCompletion('${d.id}')">Mark as Completed</button>
                                    <button class="btn-small secondary" onclick="app.toggleChat('${d.id}')">Chat with Customer</button>
                                `}
                            </div>

                            ${this.getChatHtml(d)}
                        </div>
                        `;
                    }).join('');
                }

                if (completedJobs.length === 0) {
                    historyList.innerHTML = '<div class="empty-state">No completed jobs yet.</div>';
                } else {
                    historyList.innerHTML = completedJobs.map(d => {
                        const cust = getCustomerDetails(d.customer);
                        return `
                        <div class="list-item">
                            <div style="font-weight: 600;">${d.title} <span class="badge completed">COMPLETED</span></div>
                            <div class="docket-details">Customer: ${cust.name}</div>
                            <div class="docket-details">Mobile: ${cust.mobile}</div>
                            <div class="docket-details">Work Type: ${d.type}</div>
                            <div class="docket-details">Address: ${d.address}</div>
                            <div class="docket-details">Preferred Date: ${d.preferredDate || 'N/A'}</div>
                            ${d.location ? `
                            <div class="docket-details" style="margin-top: 4px; margin-bottom: 8px;">
                                <a href="https://www.google.com/maps?q=${d.location.lat},${d.location.lng}" target="_blank" class="btn-small secondary" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none; width: auto; font-size: 0.8rem; padding: 4px 10px; border-radius: 6px;">
                                    <span>📍</span> View Location on Google Map
                                </a>
                            </div>
                            ` : ''}
                            <div class="docket-details">Details: ${d.desc}</div>
                            ${d.expectedDate ? `<div class="docket-details" style="color: var(--warning); font-weight: 600;">Expected Completion: ${d.expectedDate}</div>` : ''}
                            <div class="docket-details" style="color: var(--success); font-weight: 600;">
                                Received: ₹${d.amountReceived || 0} (${d.paymentMethod || 'Cash'})
                                <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: normal; margin-left: 10px;">
                                    (Service: ₹${d.serviceFee || d.amountReceived || 0} | Materials: ₹${d.materialCosts || 0})
                                </span>
                            </div>
                            
                            ${d.rating ? `
                                <div style="margin-top: 10px; padding: 8px; background: rgba(255, 255, 255, 0.03); border-radius: 6px; font-size: 0.85rem;">
                                    <div style="font-weight: 600; color: #f59e0b;">Customer Rating: ${'★'.repeat(d.rating)}${'☆'.repeat(5 - d.rating)}</div>
                                    ${d.review ? `<div style="margin-top: 4px; font-style: italic; color: var(--text-muted);">"${d.review}"</div>` : ''}
                                </div>
                            ` : ''}
                        </div>
                        `;
                    }).join('');
                }
            },
            // --- Homepage Background Manager ---
            bgType: 'photo', // 'photo' or 'video'

            loadHomeBg() {
                const bgData = JSON.parse(localStorage.getItem('homeBg'));
                if (bgData && bgData.src) {
                    this.applyHeroBg(bgData.src, bgData.type);
                    this.bgType = bgData.type || 'photo';
                }
                // Load saved opacity
                const savedOpacity = localStorage.getItem('homeBgOpacity');
                if (savedOpacity !== null) {
                    document.documentElement.style.setProperty('--hero-overlay-opacity', parseFloat(savedOpacity) / 100);
                }
            },

            applyHeroBg(src, type) {
                const container = document.getElementById('hero-bg-container');
                const mediaDiv = document.getElementById('hero-bg-media');
                if (!src) {
                    container.classList.add('hidden');
                    mediaDiv.innerHTML = '';
                    return;
                }

                if (type === 'video') {
                    mediaDiv.innerHTML = `<video src="${src}" autoplay muted loop playsinline></video>`;
                } else {
                    mediaDiv.innerHTML = `<img src="${src}" alt="Homepage Background">`;
                }
                container.classList.remove('hidden');
            },

            showHeroBg() {
                const bgData = JSON.parse(localStorage.getItem('homeBg'));
                if (bgData && bgData.src) {
                    document.getElementById('hero-bg-container').classList.remove('hidden');
                }
            },

            hideHeroBg() {
                document.getElementById('hero-bg-container').classList.add('hidden');
            },

            setBgType(type) {
                this.bgType = type;
                document.getElementById('bg-toggle-photo').classList.toggle('active-toggle', type === 'photo');
                document.getElementById('bg-toggle-video').classList.toggle('active-toggle', type === 'video');

                // Update file accept
                const fileInput = document.getElementById('bg-file-input');
                if (type === 'video') {
                    fileInput.accept = 'video/*';
                } else {
                    fileInput.accept = 'image/*';
                }
            },

            handleBgFileUpload(e) {
                const file = e.target.files[0];
                if (!file) return;

                // Determine type from file
                const isVideo = file.type.startsWith('video/');
                const type = isVideo ? 'video' : 'photo';
                this.setBgType(type);

                // File size warning (> 5MB for localStorage)
                if (file.size > 5 * 1024 * 1024) {
                    if (!confirm('This file is larger than 5MB. It will be stored in browser storage and may cause performance issues. For large videos, consider using a URL instead. Continue?')) {
                        e.target.value = '';
                        return;
                    }
                }

                const reader = new FileReader();
                reader.onload = (ev) => {
                    const src = ev.target.result;
                    this.saveBg(src, type);
                    this.renderBgPreview();
                    alert('Background updated successfully!');
                };
                reader.onerror = () => {
                    alert('Error reading the file. Please try again.');
                };
                reader.readAsDataURL(file);
                e.target.value = '';
            },

            applyBgFromUrl() {
                const url = document.getElementById('bg-url-input').value.trim();
                if (!url) {
                    alert('Please enter a valid URL.');
                    return;
                }

                const type = this.bgType;
                this.saveBg(url, type);
                this.renderBgPreview();
                document.getElementById('bg-url-input').value = '';
                alert('Background updated successfully!');
            },

            saveBg(src, type) {
                try {
                    localStorage.setItem('homeBg', JSON.stringify({ src, type }));
                } catch (e) {
                    alert('Failed to save: The file may be too large for browser storage. Try using a URL instead.');
                    return;
                }
                this.applyHeroBg(src, type);
                // Show on login, hide on dashboard
                if (!state.currentUser) {
                    this.showHeroBg();
                }
            },

            removeBg() {
                if (!confirm('Remove the homepage background?')) return;
                localStorage.removeItem('homeBg');
                localStorage.removeItem('homeBgOpacity');
                this.applyHeroBg(null, null);
                // Reset overlay opacity to default
                document.documentElement.style.setProperty('--hero-overlay-opacity', 0.4);
                // Reset slider if visible
                const slider = document.getElementById('bg-opacity-slider');
                if (slider) slider.value = 40;
                const valDisplay = document.getElementById('bg-opacity-value');
                if (valDisplay) valDisplay.textContent = '40%';
                this.renderBgPreview();
                alert('Background removed.');
            },

            updateBgOpacity(value) {
                const opacity = parseFloat(value) / 100;
                document.documentElement.style.setProperty('--hero-overlay-opacity', opacity);
                const valDisplay = document.getElementById('bg-opacity-value');
                if (valDisplay) valDisplay.textContent = value + '%';
                localStorage.setItem('homeBgOpacity', value);
            },

            renderBgPreview() {
                const bgData = JSON.parse(localStorage.getItem('homeBg'));
                const previewContainer = document.getElementById('bg-preview-container');
                const placeholder = document.getElementById('bg-preview-placeholder');

                if (!previewContainer) return;

                if (bgData && bgData.src) {
                    if (placeholder) placeholder.style.display = 'none';
                    // Remove old preview media
                    const oldMedia = previewContainer.querySelector('img, video');
                    if (oldMedia) oldMedia.remove();

                    if (bgData.type === 'video') {
                        const vid = document.createElement('video');
                        vid.src = bgData.src;
                        vid.autoplay = true;
                        vid.muted = true;
                        vid.loop = true;
                        vid.playsInline = true;
                        previewContainer.appendChild(vid);
                    } else {
                        const img = document.createElement('img');
                        img.src = bgData.src;
                        img.alt = 'Background Preview';
                        previewContainer.appendChild(img);
                    }

                    // Sync toggle
                    this.setBgType(bgData.type || 'photo');
                } else {
                    if (placeholder) placeholder.style.display = 'block';
                    const oldMedia = previewContainer.querySelector('img, video');
                    if (oldMedia) oldMedia.remove();
                }

                // Sync opacity slider
                const slider = document.getElementById('bg-opacity-slider');
                const valDisplay = document.getElementById('bg-opacity-value');
                const savedOpacity = localStorage.getItem('homeBgOpacity') || '40';
                if (slider) slider.value = savedOpacity;
                if (valDisplay) valDisplay.textContent = savedOpacity + '%';
            }
        };

        // Initialize App
        app.init();
        app.loadHomeBg();
    
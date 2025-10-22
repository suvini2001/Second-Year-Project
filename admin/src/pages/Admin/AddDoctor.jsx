import React from 'react'
import { assets } from '../../assets/assets'

const AddDoctor = () => {
    return (
        <form>
            <p>Add Doctor</p>
            <div>
                <div>
                    <label htmlFor="doc-img">
                        <img src={assets.upload_area} alt="" />
                    </label>
                    <input type="file" id='doc-img' hidden />
                    <p>Upload Doctor's <br />Image</p>

                </div>

                <div>
                    <div>
                        <div>
                            <p>Doctor's Name</p>
                            <input type="text" placeholder='Name' required />
                        </div>

                        <div>
                            <p>Doctor's Email</p>
                            <input type="email" placeholder='Email' required />
                        </div>

                        <div>
                            <p>Doctor's Password</p>
                            <input type="password" placeholder='Password' required />
                        </div>

                        <div>
                            <p>Doctor'Experience</p>
                            <select name="" id="">
                                <option value="1 year"> 1 Year </option>
                                <option value="2 year"> 2 Year </option>
                                <option value="3 year"> 3 Year </option>
                                <option value="4 year"> 4 Year </option>
                                <option value="5 year"> 5 Year </option>
                                <option value="6 year"> 6 Year </option>
                                <option value="7 year"> 7 Year </option>
                                <option value="8 year"> 8 Year </option>
                                <option value="9 year"> 9 Year </option>
                                <option value="10+ year"> 10+ Year </option>
                            </select>
                        </div>

                        <div>
                            <p>Fees</p>
                            <input type="number" placeholder='fees' required />
                        </div>

                    </div>

                    <div>
                        <div>
                            <p>Speciality</p>
                            <select name="" id="">
                                <option value="General Physician">General Physician</option>
                                <option value="Gynecologist">Gynecologist</option>
                                <option value="Dermotologist">Dermotologist</option>
                                <option value="Pediatrician">Pediatrician</option>
                                <option value="Neurologist">Neurologist</option>
                                <option value="Gastroenterologist">Gastroenterologist</option>
                            </select>
                        </div>

                        <div>
                            <p>Education</p>
                            <input type="text" placeholder='Education' required />
                        </div>

                        <div>
                            <p>Address</p>
                            <input type="text" placeholder='Address 1' required />
                        </div>

                        <div>
                            <p>Address</p>
                            <input type="text" placeholder='Address 2' required />
                        </div>

                        <div>
                            <p>About Doctor</p>
                            <textarea placeholder=' Write About Doctor' rows={5} required />
                        </div>

                        <button>
                            Add Doctor
                        </button>



                    </div>
                </div>
            </div>


        </form>
    )
}

export default AddDoctor
//third_party/javascript/asn1js/asn1.js
/*
 * @license
 * Copyright (c) 2014, GMO GlobalSign
 * Copyright (c) 2015, Peculiar Ventures
 * All rights reserved.
 *
 * Author 2014-2015, Yury Strozhevsky <www.strozhevsky.com>.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 * IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 * NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY
 * OF SUCH DAMAGE.
 *
 */
(
function(in_window)
{
    //**************************************************************************************
    // #region Declaration of global variables
    //**************************************************************************************
    // #region "org" namespace
    if(typeof in_window.org === "undefined")
        in_window.org = {};
    else
    {
        if(typeof in_window.org !== "object")
            throw new Error("Name org already exists and it's not an object");
    }
    // #endregion

    // #region "org.pkijs" namespace
    if(typeof in_window.org.pkijs === "undefined")
        in_window.org.pkijs = {};
    else
    {
        if(typeof in_window.org.pkijs !== "object")
            throw new Error("Name org.pkijs already exists and it's not an object" + " but " + (typeof in_window.org.pkijs));
    }
    // #endregion

    // #region "org.pkijs.asn1" namespace
    if(typeof in_window.org.pkijs.asn1 === "undefined")
        in_window.org.pkijs.asn1 = {};
    else
    {
        if(typeof in_window.org.pkijs.asn1 !== "object")
            throw new Error("Name org.pkijs.asn1 already exists and it's not an object" + " but " + (typeof in_window.org.pkijs.asn1));
    }
    // #endregion

    // #region "local" namespace
    var local = {};
    // #endregion
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Aux-functions
    //**************************************************************************************
    function util_frombase(input_buffer, input_base)
    {
        /// <summary>Convert number from 2^base to 2^10</summary>
        /// <param name="input_buffer" type="Uint8Array">Array of bytes representing the number to convert</param>
        /// <param name="input_base" type="Number">The base of initial number</param>

        var result = 0;

        for(var i = (input_buffer.length - 1); i >= 0; i-- )
            result += input_buffer[(input_buffer.length - 1) - i] * Math.pow(2, input_base * i);

        return result;
    }
    //**************************************************************************************
    function util_tobase(value, base, reserved)
    {
        /// <summary>Convert number from 2^10 to 2^base</summary>
        /// <param name="value" type="Number">The number to convert</param>
        /// <param name="base" type="Number">The base for 2^base</param>
        /// <param name="reserved" type="Number">Pre-defined number of bytes in output array (-1 = limited by function itself)</param>

        reserved = reserved || (-1);

        var result = 0;
        var biggest = Math.pow(2, base);

        for(var i = 1; i < 8; i++)
        {
            if(value < biggest)
            {
                var ret_buf;

                if( reserved < 0 )
                {
                    ret_buf = new ArrayBuffer(i);
                    result = i;
                }
                else
                {
                    if(reserved < i)
                        return (new ArrayBuffer(0));

                    ret_buf = new ArrayBuffer(reserved);

                    result = reserved;
                }

                var ret_view = new Uint8Array(ret_buf);

                for(var j = ( i - 1 ); j >= 0; j-- )
                {
                    var basis = Math.pow(2, j * base);

                    ret_view[ result - j - 1 ] = Math.floor( value / basis );
                    value -= ( ret_view[ result - j - 1 ] ) * basis;
                }

                return ret_buf;
            }

            biggest *= Math.pow(2, base);
        }
    }
    //**************************************************************************************
    function util_encode_tc(value)
    {
        /// <summary>Encode integer value to "two complement" format</summary>
        /// <param name="value" type="Number">Value to encode</param>

        var mod_value = (value < 0) ? (value * (-1)) : value;
        var big_int = 128;

        for(var i = 1; i < 8; i++)
        {
            if( mod_value <= big_int )
            {
                if( value < 0 )
                {
                    var small_int = big_int - mod_value;

                    var ret_buf = util_tobase( small_int, 8, i );
                    var ret_view = new Uint8Array(ret_buf);

                    ret_view[ 0 ] |= 0x80;

                    return ret_buf;
                }
                else
                {
                    var ret_buf = util_tobase( mod_value, 8, i );
                    var ret_view = new Uint8Array(ret_buf);

                    if( ret_view[ 0 ] & 0x80 )
                    {
                        var temp_buf = util_copybuf(ret_buf);
                        var temp_view = new Uint8Array(temp_buf);

                        ret_buf = new ArrayBuffer( ret_buf.byteLength + 1 );
                        ret_view = new Uint8Array(ret_buf);

                        for(var k = 0; k < temp_buf.byteLength; k++)
                            ret_view[k + 1] = temp_view[k];

                        ret_view[0] = 0x00;
                    }

                    return ret_buf;
                }
            }

            big_int *= Math.pow(2, 8);
        }

        return (new ArrayBuffer(0));
    }
    //**************************************************************************************
    function util_decode_tc()
    {
        /// <summary>Decoding of "two complement" values</summary>
        /// <remarks>The function must be called in scope of instance of "hex_block" class ("value_hex" and "warnings" properties must be present)</remarks>

        var buf = new Uint8Array(this.value_hex);

        if(this.value_hex.byteLength >= 2)
        {
            var condition_1 = (buf[0] == 0xFF) && (buf[1] & 0x80);
            var condition_2 = (buf[0] == 0x00) && ((buf[1] & 0x80) == 0x00);

            if(condition_1 || condition_2)
                this.warnings.push("Needlessly long format");
        }

        // #region Create big part of the integer
        var big_int_buffer = new ArrayBuffer(this.value_hex.byteLength);
        var big_int_view = new Uint8Array(big_int_buffer);
        for(var i = 0; i < this.value_hex.byteLength; i++)
            big_int_view[i] = 0;

        big_int_view[0] = (buf[0] & 0x80); // mask only the biggest bit

        var big_int = util_frombase(big_int_view, 8);
        // #endregion

        // #region Create small part of the integer
        var small_int_buffer = new ArrayBuffer(this.value_hex.byteLength);
        var small_int_view = new Uint8Array(small_int_buffer);
        for(var j = 0; j < this.value_hex.byteLength; j++)
            small_int_view[j] = buf[j];

        small_int_view[0] &= 0x7F; // mask biggest bit

        var small_int = util_frombase(small_int_view, 8);
        // #endregion

        return (small_int - big_int);
    }
    //**************************************************************************************
    function util_copybuf(input_buffer)
    {
        /// <summary>Creating a copy of input ArrayBuffer</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ArrayBuffer for coping</param>

        if(check_buffer_params(input_buffer, 0, input_buffer.byteLength) === false)
            return (new ArrayBuffer(0));

        var input_view = new Uint8Array(input_buffer);

        var ret_buf = new ArrayBuffer(input_buffer.byteLength);
        var ret_view = new Uint8Array(ret_buf);

        for(var i = 0; i < input_buffer.byteLength; i++)
            ret_view[i] = input_view[i];

        return ret_buf;
    }
    //**************************************************************************************
    function util_copybuf_offset(input_buffer, input_offset, input_length)
    {
        /// <summary>Creating a copy of input ArrayBuffer</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ArrayBuffer for coping</param>

        if(check_buffer_params(input_buffer, input_offset, input_length) === false)
            return (new ArrayBuffer(0));

        var input_view = new Uint8Array(input_buffer, input_offset, input_length);

        var ret_buf = new ArrayBuffer(input_length);
        var ret_view = new Uint8Array(ret_buf);

        for(var i = 0; i < input_length; i++)
            ret_view[i] = input_view[i];

        return ret_buf;
    }
    //**************************************************************************************
    function util_concatbuf(input_buf1, input_buf2)
    {
        /// <summary>Concatenate two ArrayBuffers</summary>
        /// <param name="input_buf1" type="ArrayBuffer">First ArrayBuffer (first part of concatenated array)</param>
        /// <param name="input_buf2" type="ArrayBuffer">Second ArrayBuffer (second part of concatenated array)</param>

        var input_view1 = new Uint8Array(input_buf1);
        var input_view2 = new Uint8Array(input_buf2);

        var ret_buf = new ArrayBuffer(input_buf1.byteLength + input_buf2.byteLength);
        var ret_view = new Uint8Array(ret_buf);

        for(var i = 0; i < input_buf1.byteLength; i++)
            ret_view[i] = input_view1[i];

        for(var j = 0; j < input_buf2.byteLength; j++)
            ret_view[input_buf1.byteLength + j] = input_view2[j];

        return ret_buf;
    }
    //**************************************************************************************
    function check_buffer_params(input_buffer, input_offset, input_length)
    {
        if((input_buffer instanceof ArrayBuffer) === false)
        {
            this.error = "Wrong parameter: input_buffer must be \"ArrayBuffer\"";
            return false;
        }

        if(input_buffer.byteLength === 0)
        {
            this.error = "Wrong parameter: input_buffer has zero length";
            return false;
        }

        if(input_offset < 0)
        {
            this.error = "Wrong parameter: input_offset less than zero";
            return false;
        }

        if(input_length < 0)
        {
            this.error = "Wrong parameter: input_length less than zero";
            return false;
        }

        if((input_buffer.byteLength - input_offset - input_length) < 0)
        {
            this.error = "End of input reached before message was fully decoded (inconsistent offset and length values)";
            return false;
        }

        return true;
    }
    //**************************************************************************************
    function to_hex_codes(input_buffer, input_offset, input_lenght)
    {
        if(check_buffer_params(input_buffer, input_offset, input_lenght) === false)
            return "";

        var result = "";

        var int_buffer = new Uint8Array(input_buffer, input_offset, input_lenght);

        for(var i = 0; i < int_buffer.length; i++)
        {
            var str = int_buffer[i].toString(16).toUpperCase();
            result = result + ((str.length === 1) ? " 0" : " ") + str;
        }

        return result;
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Declaration of base block class
    //**************************************************************************************
    local.base_block =
    function()
    {
        /// <summary>General class of all ASN.1 blocks</summary>

        if(arguments[0] instanceof Object)
        {
            this.block_length = in_window.org.pkijs.getValue(arguments[0], "block_length", 0);
            this.error = in_window.org.pkijs.getValue(arguments[0], "error", new String());
            this.warnings = in_window.org.pkijs.getValue(arguments[0], "warnings", new Array());
            if("value_before_decode" in arguments[0])
                this.value_before_decode = util_copybuf(arguments[0].value_before_decode);
            else
                this.value_before_decode = new ArrayBuffer(0);
        }
        else
        {
            this.block_length = 0;
            this.error = new String();
            this.warnings = new Array();
            /// <field>Copy of the value of incoming ArrayBuffer done before decoding</field>
            this.value_before_decode = new ArrayBuffer(0);
        }
    }
    //**************************************************************************************
    local.base_block.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "base_block";
    }
    //**************************************************************************************
    local.base_block.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        return {
            block_name: local.base_block.prototype.block_name.call(this),
            block_length: this.block_length,
            error: this.error,
            warnings: this.warnings,
            value_before_decode: in_window.org.pkijs.bufferToHexCodes(this.value_before_decode, 0, this.value_before_decode.byteLength)
        };
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Declaration of hex block class
    //**************************************************************************************
    local.hex_block =
    function()
    {
        /// <summary>Descendant of "base_block" with internal ArrayBuffer. Need to have it in case it is not possible to store ASN.1 value in native formats</summary>

        local.base_block.call(this, arguments[0]);

        if(arguments[0] instanceof Object)
        {
            this.is_hex_only = in_window.org.pkijs.getValue(arguments[0], "is_hex_only", false);
            if("value_hex" in arguments[0])
                this.value_hex = util_copybuf(arguments[0].value_hex);
            else
                this.value_hex = new ArrayBuffer(0);
        }
        else
        {
            this.is_hex_only = false;
            this.value_hex = new ArrayBuffer(0);
        }
    }
    //**************************************************************************************
    local.hex_block.prototype = new local.base_block();
    local.hex_block.constructor = local.hex_block;
    //**************************************************************************************
    local.hex_block.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "hex_block";
    }
    //**************************************************************************************
    local.hex_block.prototype.fromBER =
    function(input_buffer, input_offset, input_length)
    {
        /// <summary>Base function for converting block from BER encoded array of bytes</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array</param>
        /// <param name="input_offset" type="Number">Offset in ASN.1 BER encoded array where decoding should be started</param>
        /// <param name="input_length" type="Number">Maximum length of array of bytes which can be using in this function</param>

        // #region Basic check for parameters
        if(check_buffer_params.call(this, input_buffer, input_offset, input_length) === false)
            return (-1);
        // #endregion

        // #region Getting Uint8Array from ArrayBuffer
        var int_buffer = new Uint8Array(input_buffer, input_offset, input_length);
        // #endregion

        // #region Initial checks
        if(int_buffer.length == 0)
        {
            this.warnings.push("Zero buffer length");
            return input_offset;
        }
        // #endregion

        // #region Copy input buffer to internal buffer
        this.value_hex = new ArrayBuffer(input_length);
        var view = new Uint8Array(this.value_hex);

        for(var i = 0; i < int_buffer.length; i++)
            view[i] = int_buffer[i];
        // #endregion

        this.block_length = input_length;

        return (input_offset + input_length);
    }
    //**************************************************************************************
    local.hex_block.prototype.toBER =
    function(size_only)
    {
        /// <summary>Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)</summary>
        /// <param name="size_only" type="Boolean">Flag that we need only a size of encoding, not a real array of bytes</param>

        if(typeof size_only === "undefined")
            size_only = false;

        if(this.is_hex_only !== true)
        {
            this.error = "Flag \"is_hex_only\" is not set, abort";
            return (new ArrayBuffer(0));
        }

        var ret_buf = new ArrayBuffer(this.value_hex.byteLength);

        if(size_only === true)
            return ret_buf;

        var ret_view = new Uint8Array(ret_buf);
        var cur_view = new Uint8Array(this.value_hex);

        for(var i = 0; i < cur_view.length; i++)
            ret_view[i] = cur_view[i];

        return ret_buf;
    }
    //**************************************************************************************
    local.hex_block.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.base_block.prototype.toJSON.call(this);

        _object.block_name = local.hex_block.prototype.block_name.call(this);
        _object.is_hex_only = this.is_hex_only;
        _object.value_hex = in_window.org.pkijs.bufferToHexCodes(this.value_hex, 0, this.value_hex.byteLength)

        return _object;
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Declaration of identification block class
    //**************************************************************************************
    local.identification_block =
    function()
    {
        /// <summary>Base class of ASN.1 "identification block"</summary>

        local.hex_block.call(this, arguments[0]);

        this.tag_class = (-1);
        this.tag_number = (-1);
        this.is_constructed = false;

        if(arguments[0] instanceof Object)
        {
            if("id_block" in arguments[0])
            {
                // #region Properties from hex_block class
                this.is_hex_only = in_window.org.pkijs.getValue(arguments[0].id_block, "is_hex_only", false);
                this.value_hex = in_window.org.pkijs.getValue(arguments[0].id_block, "value_hex", new ArrayBuffer(0));
                // #endregion

                this.tag_class = in_window.org.pkijs.getValue(arguments[0].id_block, "tag_class", (-1));
                this.tag_number = in_window.org.pkijs.getValue(arguments[0].id_block, "tag_number", (-1));
                this.is_constructed = in_window.org.pkijs.getValue(arguments[0].id_block, "is_constructed", false);
            }
        }
    }
    //**************************************************************************************
    local.identification_block.prototype = new local.hex_block();
    local.identification_block.constructor = local.identification_block;
    //**************************************************************************************
    local.identification_block.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "identification_block";
    }
    //**************************************************************************************
    local.identification_block.prototype.toBER =
    function(size_only)
    {
        /// <summary>Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)</summary>
        /// <param name="size_only" type="Boolean">Flag that we need only a size of encoding, not a real array of bytes</param>

        if(typeof size_only === "undefined")
            size_only = false;

        var first_octet = 0;

        switch(this.tag_class)
        {
            case 1:
                first_octet |= 0x00; // UNIVERSAL
                break;
            case 2:
                first_octet |= 0x40; // APPLICATION
                break;
            case 3:
                first_octet |= 0x80; // CONTEXT-SPECIFIC
                break;
            case 4:
                first_octet |= 0xC0; // PRIVATE
                break;
            default:
                this.error = "Unknown tag class";
                return (new ArrayBuffer(0));
        }

        if(this.is_constructed)
            first_octet |= 0x20;

        if((this.tag_number < 31) && (!this.is_hex_only))
        {
            var ret_buf = new ArrayBuffer(1);
            var ret_view = new Uint8Array(ret_buf);

            if(!size_only)
            {
                var number = this.tag_number;
                number &= 0x1F;
                first_octet |= number;

                ret_view[0] = first_octet;
            }

            return ret_buf;
        }
        else
        {
            if(this.is_hex_only === false)
            {
                var encoded_buf = util_tobase(this.tag_number, 7);
                var encoded_view = new Uint8Array(encoded_buf);
                var size = encoded_buf.byteLength;

                var ret_buf = new ArrayBuffer(size + 1);
                var ret_view = new Uint8Array(ret_buf);

                ret_view[0] = (first_octet | 0x1F);

                if(!size_only)
                {
                    for(var i = 0; i < (size - 1) ; i++)
                        ret_view[i + 1] = encoded_view[i] | 0x80;

                    ret_view[size] = encoded_view[size - 1];
                }

                return ret_buf;
            }
            else
            {
                var ret_buf = new ArrayBuffer(this.value_hex.byteLength + 1);
                var ret_view = new Uint8Array(ret_buf);

                ret_view[0] = (first_octet | 0x1F);

                if(size_only === false)
                {
                    var cur_view = new Uint8Array(this.value_hex);

                    for(var i = 0; i < (cur_view.length - 1); i++)
                        ret_view[i + 1] = cur_view[i] | 0x80;

                    ret_view[this.value_hex.byteLength] = cur_view[cur_view.length - 1];
                }

                return ret_buf;
            }
        }
    }
    //**************************************************************************************
    local.identification_block.prototype.fromBER =
    function(input_buffer, input_offset, input_length)
    {
        /// <summary>Base function for converting block from BER encoded array of bytes</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array</param>
        /// <param name="input_offset" type="Number">Offset in ASN.1 BER encoded array where decoding should be started</param>
        /// <param name="input_length" type="Number">Maximum length of array of bytes which can be using in this function</param>

        // #region Basic check for parameters
        if(check_buffer_params.call(this, input_buffer, input_offset, input_length) === false)
            return (-1);
        // #endregion

        // #region Getting Uint8Array from ArrayBuffer
        var int_buffer = new Uint8Array(input_buffer, input_offset, input_length);
        // #endregion

        // #region Initial checks
        if(int_buffer.length == 0)
        {
            this.error = "Zero buffer length";
            return (-1);
        }
        // #endregion

        // #region Find tag class
        var tag_class_mask = int_buffer[0] & 0xC0;

        switch(tag_class_mask)
        {
            case 0x00:
                this.tag_class = (1); // UNIVERSAL
                break;
            case 0x40:
                this.tag_class = (2); // APPLICATION
                break;
            case 0x80:
                this.tag_class = (3); // CONTEXT-SPECIFIC
                break;
            case 0xC0:
                this.tag_class = (4); // PRIVATE
                break;
            default:
                this.error = "Unknown tag class";
                return ( -1 );
        }
        // #endregion

        // #region Find it's constructed or not
        if((int_buffer[0] & 0x20) == 0x20)
            this.is_constructed = true;
        else
            this.is_constructed = false;
        // #endregion

        // #region Find tag number
        this.is_hex_only = false;

        var tag_number_mask = int_buffer[0] & 0x1F;

        // #region Simple case (tag number < 31)
        if(tag_number_mask != 0x1F)
        {
            this.tag_number = (tag_number_mask);
            this.block_length = 1;
        }
            // #endregion
        // #region Tag number bigger or equal to 31
        else
        {
            var count = 1;

            this.value_hex = new ArrayBuffer(255);
            var tag_number_buffer_max_length = 255;
            var int_tag_number_buffer = new Uint8Array(this.value_hex);

            while(int_buffer[count] & 0x80)
            {
                int_tag_number_buffer[count - 1] = int_buffer[count] & 0x7F;
                count++;

                if(count >= int_buffer.length)
                {
                    this.error = "End of input reached before message was fully decoded";
                    return (-1);
                }

                // #region In case if tag number length is greater than 255 bytes (rare but possible case)
                if(count == tag_number_buffer_max_length)
                {
                    tag_number_buffer_max_length += 255;

                    var temp_buffer = new ArrayBuffer(tag_number_buffer_max_length);
                    var temp_buffer_view = new Uint8Array(temp_buffer);

                    for(var i = 0; i < int_tag_number_buffer.length; i++)
                        temp_buffer_view[i] = int_tag_number_buffer[i];

                    this.value_hex = new ArrayBuffer(tag_number_buffer_max_length);
                    int_tag_number_buffer = new Uint8Array(this.value_hex);
                }
                // #endregion
            }

            this.block_length = (count + 1);
            int_tag_number_buffer[count - 1] = int_buffer[count] & 0x7F; // Write last byte to buffer

            // #region Cut buffer
            var temp_buffer = new ArrayBuffer(count);
            var temp_buffer_view = new Uint8Array(temp_buffer);
            for(var i = 0; i < count; i++)
                temp_buffer_view[i] = int_tag_number_buffer[i];

            this.value_hex = new ArrayBuffer(count);
            int_tag_number_buffer = new Uint8Array(this.value_hex);
            int_tag_number_buffer.set(temp_buffer_view);
            // #endregion

            // #region Try to convert long tag number to short form
            if(this.block_length <= 9)
                this.tag_number = util_frombase(int_tag_number_buffer, 7);
            else
            {
                this.is_hex_only = true;
                this.warnings.push("Tag too long, represented as hex-coded");
            }
            // #endregion
        }
        // #endregion
        // #endregion

        // #region Check if constructed encoding was using for primitive type
        if(((this.tag_class == 1)) &&
            (this.is_constructed))
        {
            switch(this.tag_number)
            {
                case 1:  // BOOLEAN
                case 2:  // REAL
                case 5:  // NULL
                case 6:  // OBJECT IDENTIFIER
                case 9:  // REAL
                case 14: // TIME
                case 23:
                case 24:
                case 31:
                case 32:
                case 33:
                case 34:
                    this.error = "Constructed encoding used for primitive type";
                    return (-1);
                default:
                    ;
            }
        }
        // #endregion

        return ( input_offset + this.block_length ); // Return current offset in input buffer
    }
    //**************************************************************************************
    local.identification_block.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.hex_block.prototype.toJSON.call(this);

        _object.block_name = local.identification_block.prototype.block_name.call(this);
        _object.tag_class = this.tag_class;
        _object.tag_number = this.tag_number;
        _object.is_constructed = this.is_constructed;

        return _object;
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Declaration of length block class
    //**************************************************************************************
    local.length_block =
    function()
    {
        /// <summary>Base class of ASN.1 "length block"</summary>

        local.base_block.call(this, arguments[0]);

        this.is_indefinite_form = false;
        this.long_form_used = false;
        this.length = (0);

        if(arguments[0] instanceof Object)
        {
            if("len_block" in arguments[0])
            {
                this.is_indefinite_form = in_window.org.pkijs.getValue(arguments[0].len_block, "is_indefinite_form", false);
                this.long_form_used = in_window.org.pkijs.getValue(arguments[0].len_block, "long_form_used", false);
                this.length = in_window.org.pkijs.getValue(arguments[0].len_block, "length", 0);
            }
        }
    }
    //**************************************************************************************
    local.length_block.prototype = new local.base_block();
    local.length_block.constructor = local.length_block;
    //**************************************************************************************
    local.length_block.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "length_block";
    }
    //**************************************************************************************
    local.length_block.prototype.fromBER =
    function(input_buffer, input_offset, input_length)
    {
        /// <summary>Base function for converting block from BER encoded array of bytes</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array</param>
        /// <param name="input_offset" type="Number">Offset in ASN.1 BER encoded array where decoding should be started</param>
        /// <param name="input_length" type="Number">Maximum length of array of bytes which can be using in this function</param>

        // #region Basic check for parameters
        if(check_buffer_params.call(this, input_buffer, input_offset, input_length) === false)
            return (-1);
        // #endregion

        // #region Getting Uint8Array from ArrayBuffer
        var int_buffer = new Uint8Array(input_buffer, input_offset, input_length);
        // #endregion

        // #region Initial checks
        if(int_buffer.length == 0)
        {
            this.error = "Zero buffer length";
            return (-1);
        }

        if(int_buffer[0] == 0xFF)
        {
            this.error = "Length block 0xFF is reserved by standard";
            return (-1);
        }
        // #endregion

        // #region Check for length form type
        if(int_buffer[0] == 0x80)
            this.is_indefinite_form = true;
        else
            this.is_indefinite_form = false;
        // #endregion

        // #region Stop working in case of indefinite length form
        if(this.is_indefinite_form == true)
        {
            this.block_length = 1;
            return (input_offset + this.block_length);
        }
        // #endregion

        // #region Check is long form of length encoding using
        if(int_buffer[0] & 0x80)
            this.long_form_used = true;
        else
            this.long_form_used = false;
        // #endregion

        // #region Stop working in case of short form of length value
        if(this.long_form_used == false)
        {
            this.length = (int_buffer[0]);
            this.block_length = 1;
            return (input_offset + this.block_length);
        }
        // #endregion

        // #region Calculate length value in case of long form
        var count = int_buffer[0] & 0x7F;

        if(count > 8) // Too big length value
        {
            this.error = "Too big integer";
            return (-1);
        }

        if((count + 1) > int_buffer.length)
        {
            this.error = "End of input reached before message was fully decoded";
            return (-1);
        }

        var length_buffer_view = new Uint8Array(count);

        for(var i = 0; i < count; i++)
            length_buffer_view[i] = int_buffer[i + 1];

        if(length_buffer_view[count - 1] == 0x00)
            this.warnings.push("Needlessly long encoded length");

        this.length = util_frombase(length_buffer_view, 8);

        if(this.long_form_used && (this.length <= 127))
            this.warnings.push("Unneccesary usage of long length form");

        this.block_length = count + 1;
        // #endregion

        return (input_offset + this.block_length); // Return current offset in input buffer
    }
    //**************************************************************************************
    local.length_block.prototype.toBER =
    function(size_only)
    {
        /// <summary>Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)</summary>
        /// <param name="size_only" type="Boolean">Flag that we need only a size of encoding, not a real array of bytes</param>

        if(typeof size_only === "undefined")
            size_only = false;

        if(this.length > 127)
            this.long_form_used = true;

        if(this.is_indefinite_form)
        {
            var ret_buf = new ArrayBuffer(1);

            if(size_only === false)
            {
                var ret_view = new Uint8Array(ret_buf);
                ret_view[0] = 0x80;
            }

            return ret_buf;
        }

        if(this.long_form_used === true)
        {
            var encoded_buf = util_tobase(this.length, 8);

            if(encoded_buf.byteLength > 127)
            {
                this.error = "Too big length";
                return (new ArrayBuffer(0));
            }

            var ret_buf = new ArrayBuffer(encoded_buf.byteLength + 1);

            if(size_only === true)
                return ret_buf;

            var encoded_view = new Uint8Array(encoded_buf);
            var ret_view = new Uint8Array(ret_buf);

            ret_view[0] = encoded_buf.byteLength | 0x80;

            for(var i = 0; i < encoded_buf.byteLength; i++)
                ret_view[i + 1] = encoded_view[i];

            return ret_buf;
        }
        else
        {
            var ret_buf = new ArrayBuffer(1);

            if(size_only === false)
            {
                var ret_view = new Uint8Array(ret_buf);

                ret_view[0] = this.length;
            }

            return ret_buf;
        }

        return (new ArrayBuffer(0));
    }
    //**************************************************************************************
    local.length_block.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.base_block.prototype.toJSON.call(this);

        _object.block_name = local.length_block.prototype.block_name.call(this);
        _object.is_indefinite_form = this.is_indefinite_form;
        _object.long_form_used = this.long_form_used;
        _object.length = this.length;

        return _object;
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Declaration of value block class
    //**************************************************************************************
    local.value_block =
    function()
    {
        /// <summary>Generic class of ASN.1 "value block"</summary>
        local.base_block.call(this, arguments[0]);
    }
    //**************************************************************************************
    local.value_block.prototype = new local.base_block();
    local.value_block.constructor = local.value_block;
    //**************************************************************************************
    local.value_block.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "value_block";
    }
    //**************************************************************************************
    local.value_block.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.base_block.prototype.toJSON.call(this);

        _object.block_name = local.value_block.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Declaration of basic ASN.1 block class
    //**************************************************************************************
    in_window.org.pkijs.asn1.ASN1_block =
    function()
    {
        /// <summary>Base class of ASN.1 block (identification block + length block + value block)</summary>

        local.base_block.call(this, arguments[0]);

        if(arguments[0] instanceof Object)
        {
            this.name = in_window.org.pkijs.getValue(arguments[0], "name", "");
            this.optional = in_window.org.pkijs.getValue(arguments[0], "optional", false);

            if("primitive_schema" in arguments[0])
                this.primitive_schema = arguments[0].primitive_schema;
        }

        this.id_block = new local.identification_block(arguments[0]);
        this.len_block = new local.length_block(arguments[0]);
        this.value_block = new local.value_block(arguments[0]);
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.ASN1_block.prototype = new local.base_block();
    in_window.org.pkijs.asn1.ASN1_block.constructor = in_window.org.pkijs.asn1.ASN1_block;
    //**************************************************************************************
    in_window.org.pkijs.asn1.ASN1_block.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "ASN1_block";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.ASN1_block.prototype.fromBER =
    function(input_buffer, input_offset, input_length)
    {
        /// <summary>Base function for converting block from BER encoded array of bytes</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array</param>
        /// <param name="input_offset" type="Number">Offset in ASN.1 BER encoded array where decoding should be started</param>
        /// <param name="input_length" type="Number">Maximum length of array of bytes which can be using in this function</param>

        var result_offset = this.value_block.fromBER(input_buffer, input_offset, (this.len_block.is_indefinite_form == true) ? input_length : this.len_block.length);
        if(result_offset == (-1))
        {
            this.error = this.value_block.error;
            return result_offset;
        }

        if(this.id_block.error.length == 0)
            this.block_length += this.id_block.block_length;

        if(this.len_block.error.length == 0)
            this.block_length += this.len_block.block_length;

        if(this.value_block.error.length == 0)
            this.block_length += this.value_block.block_length;

        return result_offset;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.ASN1_block.prototype.toBER =
    function(size_only)
    {
        /// <summary>Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)</summary>
        /// <param name="size_only" type="Boolean">Flag that we need only a size of encoding, not a real array of bytes</param>

        if(typeof size_only === "undefined")
            size_only = false;

        var ret_buf;

        var id_block_buf = this.id_block.toBER(size_only);
        var value_block_size_buf = this.value_block.toBER(true);

        this.len_block.length = value_block_size_buf.byteLength;
        var len_block_buf = this.len_block.toBER(size_only);

        ret_buf = util_concatbuf(id_block_buf, len_block_buf);

        var value_block_buf;

        if(size_only === false)
            value_block_buf = this.value_block.toBER(size_only);
        else
            value_block_buf = new ArrayBuffer(this.len_block.length);

        ret_buf = util_concatbuf(ret_buf, value_block_buf);

        if(this.len_block.is_indefinite_form === true)
        {
            var indef_buf = new ArrayBuffer(2);

            if(size_only === false)
            {
                var indef_view = new Uint8Array(indef_buf);

                indef_view[0] = 0x00;
                indef_view[1] = 0x00;
            }

            ret_buf = util_concatbuf(ret_buf, indef_buf);
        }

        return ret_buf;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.ASN1_block.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.base_block.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.ASN1_block.prototype.block_name.call(this);
        _object.id_block = this.id_block.toJSON();
        _object.len_block = this.len_block.toJSON();
        _object.value_block = this.value_block.toJSON();

        if("name" in this)
            _object.name = this.name;
        if("optional" in this)
            _object.optional = this.optional;
        if("primitive_schema" in this)
            _object.primitive_schema = this.primitive_schema.toJSON();

        return _object;
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Declaration of basic block for all PRIMITIVE types
    //**************************************************************************************
    local.ASN1_PRIMITIVE_value_block =
    function()
    {
        /// <summary>Base class of ASN.1 value block for primitive values (non-constructive encoding)</summary>

        local.value_block.call(this, arguments[0]);

        if(arguments[0] instanceof Object)
        {
            // #region Variables from "hex_block" class
            if("value_hex" in arguments[0])
                this.value_hex = util_copybuf(arguments[0].value_hex);
            else
                this.value_hex = new ArrayBuffer(0);

            this.is_hex_only = in_window.org.pkijs.getValue(arguments[0], "is_hex_only", true);
            // #endregion
        }
        else
        {
            // #region Variables from "hex_block" class
            this.value_hex = new ArrayBuffer(0);
            this.is_hex_only = true;
            // #endregion
        }
    }
    //**************************************************************************************
    local.ASN1_PRIMITIVE_value_block.prototype = new local.value_block();
    local.ASN1_PRIMITIVE_value_block.constructor = local.ASN1_PRIMITIVE_value_block;
    //**************************************************************************************
    local.ASN1_PRIMITIVE_value_block.prototype.fromBER =
    function(input_buffer, input_offset, input_length)
    {
        /// <summary>Base function for converting block from BER encoded array of bytes</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array</param>
        /// <param name="input_offset" type="Number">Offset in ASN.1 BER encoded array where decoding should be started</param>
        /// <param name="input_length" type="Number">Maximum length of array of bytes which can be using in this function</param>

        // #region Basic check for parameters
        if(check_buffer_params.call(this, input_buffer, input_offset, input_length) === false)
            return (-1);
        // #endregion

        // #region Getting Uint8Array from ArrayBuffer
        var int_buffer = new Uint8Array(input_buffer, input_offset, input_length);
        // #endregion

        // #region Initial checks
        if(int_buffer.length == 0)
        {
            this.warnings.push("Zero buffer length");
            return input_offset;
        }
        // #endregion

        // #region Copy input buffer into internal buffer
        this.value_hex = new ArrayBuffer(int_buffer.length);
        var value_hex_view = new Uint8Array(this.value_hex);

        for(var i = 0; i < int_buffer.length; i++)
            value_hex_view[i] = int_buffer[i];
        // #endregion

        this.block_length = input_length;

        return (input_offset + input_length);
    }
    //**************************************************************************************
    local.ASN1_PRIMITIVE_value_block.prototype.toBER =
    function(size_only)
    {
        /// <summary>Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)</summary>
        /// <param name="size_only" type="Boolean">Flag that we need only a size of encoding, not a real array of bytes</param>

        return util_copybuf(this.value_hex);
    }
    //**************************************************************************************
    local.ASN1_PRIMITIVE_value_block.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "ASN1_PRIMITIVE_value_block";
    }
    //**************************************************************************************
    local.ASN1_PRIMITIVE_value_block.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.value_block.prototype.toJSON.call(this);

        _object.block_name = local.ASN1_PRIMITIVE_value_block.prototype.block_name.call(this);
        _object.value_hex = in_window.org.pkijs.bufferToHexCodes(this.value_hex, 0, this.value_hex.byteLength);
        _object.is_hex_only = this.is_hex_only;

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.ASN1_PRIMITIVE =
    function()
    {
        /// <summary>Base class of ASN.1 block for primitive values (non-constructive encoding)</summary>

        in_window.org.pkijs.asn1.ASN1_block.call(this, arguments[0]);

        this.id_block.is_constructed = false;
        this.value_block = new local.ASN1_PRIMITIVE_value_block(arguments[0]);
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.ASN1_PRIMITIVE.prototype = new in_window.org.pkijs.asn1.ASN1_block();
    in_window.org.pkijs.asn1.ASN1_PRIMITIVE.constructor = in_window.org.pkijs.asn1.ASN1_PRIMITIVE;
    //**************************************************************************************
    in_window.org.pkijs.asn1.ASN1_PRIMITIVE.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "PRIMITIVE";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.ASN1_PRIMITIVE.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = in_window.org.pkijs.asn1.ASN1_block.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.ASN1_PRIMITIVE.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Declaration of basic block for all CONSTRUCTED types
    //**************************************************************************************
    local.ASN1_CONSTRUCTED_value_block =
    function()
    {
        /// <summary>Base class of ASN.1 value block for constructive values (constructive encoding)</summary>

        local.value_block.call(this, arguments[0]);

        if(arguments[0] instanceof Object)
        {
            this.value = in_window.org.pkijs.getValue(arguments[0], "value", new Array());
            this.is_indefinite_form = in_window.org.pkijs.getValue(arguments[0], "is_indefinite_form", false);
        }
        else
        {
            this.value = new Array();
            this.is_indefinite_form = false;
        }
    }
    //**************************************************************************************
    local.ASN1_CONSTRUCTED_value_block.prototype = new local.value_block();
    local.ASN1_CONSTRUCTED_value_block.constructor = local.ASN1_CONSTRUCTED_value_block;
    //**************************************************************************************
    local.ASN1_CONSTRUCTED_value_block.prototype.fromBER =
    function(input_buffer, input_offset, input_length)
    {
        /// <summary>Base function for converting block from BER encoded array of bytes</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array</param>
        /// <param name="input_offset" type="Number">Offset in ASN.1 BER encoded array where decoding should be started</param>
        /// <param name="input_length" type="Number">Maximum length of array of bytes which can be using in this function</param>

        // #region Store initial offset and length
        var initial_offset = input_offset;
        var initial_length = input_length;
        // #endregion

        // #region Basic check for parameters
        if(check_buffer_params.call(this, input_buffer, input_offset, input_length) === false)
            return (-1);
        // #endregion

        // #region Getting Uint8Array from ArrayBuffer
        var int_buffer = new Uint8Array(input_buffer, input_offset, input_length);
        // #endregion

        // #region Initial checks
        if(int_buffer.length == 0)
        {
            this.warnings.push("Zero buffer length");
            return input_offset;
        }
        // #endregion

        // #region Aux function
        function check_len(_indefinite_length, _length)
        {
            if(_indefinite_length == true)
                return 1;

            return _length;
        }
        // #endregion

        var current_offset = input_offset;

        while(check_len(this.is_indefinite_form, input_length) > 0)
        {
            var return_object = fromBER_raw(input_buffer, current_offset, input_length);
            if(return_object.offset == (-1))
            {
                this.error = return_object.result.error;
                this.warnings.concat(return_object.result.warnings);
                return (-1);
            }

            current_offset = return_object.offset;

            this.block_length += return_object.result.block_length;
            input_length -= return_object.result.block_length;

            this.value.push(return_object.result);

            if((this.is_indefinite_form == true) && (return_object.result.block_name() == in_window.org.pkijs.asn1.EOC.prototype.block_name()))
                break;
        }

        if(this.is_indefinite_form == true)
        {
            if(this.value[this.value.length - 1].block_name() == in_window.org.pkijs.asn1.EOC.prototype.block_name())
                this.value.pop();
            else
                this.warnings.push("No EOC block encoded");
        }

        // #region Copy "input_buffer" to "value_before_decode"
        this.value_before_decode = util_copybuf_offset(input_buffer, initial_offset, initial_length);
        // #endregion

        return current_offset;
    }
    //**************************************************************************************
    local.ASN1_CONSTRUCTED_value_block.prototype.toBER =
    function(size_only)
    {
        /// <summary>Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)</summary>
        /// <param name="size_only" type="Boolean">Flag that we need only a size of encoding, not a real array of bytes</param>

        if(typeof size_only === "undefined")
            size_only = false;

        var ret_buf = new ArrayBuffer(0);

        for(var i = 0; i < this.value.length; i++)
        {
            var value_buf = this.value[i].toBER(size_only);
            ret_buf = util_concatbuf(ret_buf, value_buf);
        }

        return ret_buf;
    }
    //**************************************************************************************
    local.ASN1_CONSTRUCTED_value_block.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "ASN1_CONSTRUCTED_value_block";
    }
    //**************************************************************************************
    local.ASN1_CONSTRUCTED_value_block.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.value_block.prototype.toJSON.call(this);

        _object.block_name = local.ASN1_CONSTRUCTED_value_block.prototype.block_name.call(this);
        _object.is_indefinite_form = this.is_indefinite_form;
        _object.value = new Array();
        for(var i = 0; i < this.value.length; i++)
            _object.value.push(this.value[i].toJSON());

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.ASN1_CONSTRUCTED =
    function()
    {
        /// <summary>Base class of ASN.1 block for constructive values (constructive encoding)</summary>

        in_window.org.pkijs.asn1.ASN1_block.call(this, arguments[0]);

        this.id_block.is_constructed = true;
        this.value_block = new local.ASN1_CONSTRUCTED_value_block(arguments[0]);
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.ASN1_CONSTRUCTED.prototype = new in_window.org.pkijs.asn1.ASN1_block();
    in_window.org.pkijs.asn1.ASN1_CONSTRUCTED.constructor = in_window.org.pkijs.asn1.ASN1_CONSTRUCTED;
    //**************************************************************************************
    in_window.org.pkijs.asn1.ASN1_CONSTRUCTED.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "CONSTRUCTED";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.ASN1_CONSTRUCTED.prototype.fromBER =
    function(input_buffer, input_offset, input_length)
    {
        /// <summary>Base function for converting block from BER encoded array of bytes</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array</param>
        /// <param name="input_offset" type="Number">Offset in ASN.1 BER encoded array where decoding should be started</param>
        /// <param name="input_length" type="Number">Maximum length of array of bytes which can be using in this function</param>

        this.value_block.is_indefinite_form = this.len_block.is_indefinite_form;

        var result_offset = this.value_block.fromBER(input_buffer, input_offset, (this.len_block.is_indefinite_form == true) ? input_length : this.len_block.length);
        if(result_offset == (-1))
        {
            this.error = this.value_block.error;
            return result_offset;
        }

        if(this.id_block.error.length == 0)
            this.block_length += this.id_block.block_length;

        if(this.len_block.error.length == 0)
            this.block_length += this.len_block.block_length;

        if(this.value_block.error.length == 0)
            this.block_length += this.value_block.block_length;

        return result_offset;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.ASN1_CONSTRUCTED.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = in_window.org.pkijs.asn1.ASN1_block.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.ASN1_CONSTRUCTED.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Declaration of ASN.1 EOC type class
    //**************************************************************************************
    local.EOC_value_block =
    function()
    {
        local.value_block.call(this, arguments[0]);
    }
    //**************************************************************************************
    local.EOC_value_block.prototype = new local.value_block();
    local.EOC_value_block.constructor = local.EOC_value_block;
    //**************************************************************************************
    local.EOC_value_block.prototype.fromBER =
    function(input_buffer, input_offset, input_length)
    {
        /// <summary>Base function for converting block from BER encoded array of bytes</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array</param>
        /// <param name="input_offset" type="Number">Offset in ASN.1 BER encoded array where decoding should be started</param>
        /// <param name="input_length" type="Number">Maximum length of array of bytes which can be using in this function</param>

        // #region There is no "value block" for EOC type and we need to return the same offset
        return input_offset;
        // #endregion
    }
    //**************************************************************************************
    local.EOC_value_block.prototype.toBER =
    function(size_only)
    {
        /// <summary>Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)</summary>
        /// <param name="size_only" type="Boolean">Flag that we need only a size of encoding, not a real array of bytes</param>

        return (new ArrayBuffer(0));
    }
    //**************************************************************************************
    local.EOC_value_block.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "EOC_value_block";
    }
    //**************************************************************************************
    local.EOC_value_block.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.value_block.prototype.toJSON.call(this);

        _object.block_name = local.EOC_value_block.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.EOC =
    function()
    {
        in_window.org.pkijs.asn1.ASN1_block.call(this, arguments[0]);

        this.value_block = new local.EOC_value_block();

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 0; // EOC
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.EOC.prototype = new in_window.org.pkijs.asn1.ASN1_block();
    in_window.org.pkijs.asn1.EOC.constructor = local.EOC_value_block;
    //**************************************************************************************
    in_window.org.pkijs.asn1.EOC.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "END_OF_CONTENT";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.EOC.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = in_window.org.pkijs.asn1.ASN1_block.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.EOC.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Declaration of ASN.1 BOOLEAN type class
    //**************************************************************************************
    local.BOOLEAN_value_block =
    function()
    {
        local.value_block.call(this, arguments[0]);

        if(arguments[0] instanceof Object)
        {
            this.value = in_window.org.pkijs.getValue(arguments[0], "value", false);

            // #region Variables from hex_block class
            this.is_hex_only = in_window.org.pkijs.getValue(arguments[0], "is_hex_only", false);
            if("value_hex" in arguments[0])
                this.value_hex = util_copybuf(arguments[0].value_hex);
            else
            {
                this.value_hex = new ArrayBuffer(1);
                if(this.value === true)
                {
                    var view = new Uint8Array(this.value_hex);
                    view[0] = 0xFF;
                }
            }
            // #endregion
        }
        else
        {
            this.value = false;

            // #region Variables from hex_block class
            this.is_hex_only = false;
            this.value_hex = new ArrayBuffer(1);
            // #endregion
        }
    }
    //**************************************************************************************
    local.BOOLEAN_value_block.prototype = new local.value_block();
    local.BOOLEAN_value_block.constructor = local.BOOLEAN_value_block;
    //**************************************************************************************
    local.BOOLEAN_value_block.prototype.fromBER =
    function(input_buffer, input_offset, input_length)
    {
        /// <summary>Base function for converting block from BER encoded array of bytes</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array</param>
        /// <param name="input_offset" type="Number">Offset in ASN.1 BER encoded array where decoding should be started</param>
        /// <param name="input_length" type="Number">Maximum length of array of bytes which can be using in this function</param>

        // #region Basic check for parameters
        if(check_buffer_params.call(this, input_buffer, input_offset, input_length) === false)
            return (-1);
        // #endregion

        // #region Getting Uint8Array from ArrayBuffer
        var int_buffer = new Uint8Array(input_buffer, input_offset, input_length);
        // #endregion

        if(input_length > 1)
            this.warnings.push("BOOLEAN value encoded in more then 1 octet");

        if(int_buffer[0] == 0x00)
            this.value = false;
        else
            this.value = true;

        this.is_hex_only = true;

        // #region Copy input buffer to internal array
        this.value_hex = new ArrayBuffer(int_buffer.length);
        var view = new Uint8Array(this.value_hex);

        for(var i = 0; i < int_buffer.length; i++)
            view[i] = int_buffer[i];
        // #endregion

        this.block_length = input_length;

        return (input_offset + input_length);
    }
    //**************************************************************************************
    local.BOOLEAN_value_block.prototype.toBER =
    function(size_only)
    {
        /// <summary>Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)</summary>
        /// <param name="size_only" type="Boolean">Flag that we need only a size of encoding, not a real array of bytes</param>

        if(typeof size_only === "undefined")
            size_only = false;

        return this.value_hex;
    }
    //**************************************************************************************
    local.BOOLEAN_value_block.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "BOOLEAN_value_block";
    }
    //**************************************************************************************
    local.BOOLEAN_value_block.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.value_block.prototype.toJSON.call(this);

        _object.block_name = local.BOOLEAN_value_block.prototype.block_name.call(this);
        _object.value = this.value;
        _object.is_hex_only = this.is_hex_only;
        _object.value_hex = in_window.org.pkijs.bufferToHexCodes(this.value_hex, 0, this.value_hex.byteLength)

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.BOOLEAN =
    function()
    {
        in_window.org.pkijs.asn1.ASN1_block.call(this, arguments[0]);

        this.value_block = new local.BOOLEAN_value_block(arguments[0]);

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 1; // BOOLEAN
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.BOOLEAN.prototype = new in_window.org.pkijs.asn1.ASN1_block();
    in_window.org.pkijs.asn1.BOOLEAN.constructor = local.BOOLEAN_value_block;
    //**************************************************************************************
    in_window.org.pkijs.asn1.BOOLEAN.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "BOOLEAN";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.BOOLEAN.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = in_window.org.pkijs.asn1.ASN1_block.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.BOOLEAN.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Declaration of ASN.1 SEQUENCE and SET type classes
    //**************************************************************************************
    in_window.org.pkijs.asn1.SEQUENCE =
    function()
    {
        in_window.org.pkijs.asn1.ASN1_CONSTRUCTED.call(this, arguments[0]);

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 16; // SEQUENCE
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.SEQUENCE.prototype = new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED();
    in_window.org.pkijs.asn1.SEQUENCE.constructor = in_window.org.pkijs.asn1.SEQUENCE;
    //**************************************************************************************
    in_window.org.pkijs.asn1.SEQUENCE.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "SEQUENCE";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.SEQUENCE.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = in_window.org.pkijs.asn1.ASN1_CONSTRUCTED.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.SEQUENCE.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.SET =
    function()
    {
        in_window.org.pkijs.asn1.ASN1_CONSTRUCTED.call(this, arguments[0]);

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 17; // SET
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.SET.prototype = new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED();
    in_window.org.pkijs.asn1.SET.constructor = in_window.org.pkijs.asn1.SET;
    //**************************************************************************************
    in_window.org.pkijs.asn1.SET.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "SET";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.SET.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = in_window.org.pkijs.asn1.ASN1_CONSTRUCTED.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.SET.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Declaration of ASN.1 NULL type class
    //**************************************************************************************
    in_window.org.pkijs.asn1.NULL =
    function()
    {
        in_window.org.pkijs.asn1.ASN1_block.call(this, arguments[0]);

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 5; // NULL
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.NULL.prototype = new in_window.org.pkijs.asn1.ASN1_block();
    in_window.org.pkijs.asn1.NULL.constructor = in_window.org.pkijs.asn1.NULL;
    //**************************************************************************************
    in_window.org.pkijs.asn1.NULL.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "NULL";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.NULL.prototype.fromBER =
    function(input_buffer, input_offset, input_length)
    {
        /// <summary>Base function for converting block from BER encoded array of bytes</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array</param>
        /// <param name="input_offset" type="Number">Offset in ASN.1 BER encoded array where decoding should be started</param>
        /// <param name="input_length" type="Number">Maximum length of array of bytes which can be using in this function</param>

        if(this.len_block.length > 0)
            this.warnings.push("Non-zero length of value block for NULL type");

        if(this.id_block.error.length === 0)
            this.block_length += this.id_block.block_length;

        if(this.len_block.error.length === 0)
            this.block_length += this.len_block.block_length;

        this.block_length += input_length;

        return (input_offset + input_length);
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.NULL.prototype.toBER =
    function(size_only)
    {
        /// <summary>Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)</summary>
        /// <param name="size_only" type="Boolean">Flag that we need only a size of encoding, not a real array of bytes</param>

        if(typeof size_only === "undefined")
            size_only = false;

        var ret_buf = new ArrayBuffer(2);

        if(size_only === true)
            return ret_buf;

        var ret_view = new Uint8Array(ret_buf);
        ret_view[0] = 0x05;
        ret_view[1] = 0x00;

        return ret_buf;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.NULL.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = in_window.org.pkijs.asn1.ASN1_block.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.NULL.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Declaration of ASN.1 OCTETSTRING type class
    //**************************************************************************************
    local.OCTETSTRING_value_block =
    function()
    {
        /// <param name="input_value_hex" type="ArrayBuffer"></param>
        /// <param name="input_value" type="Array"></param>
        /// <param name="input_constructed" type="Boolean"></param>
        /// <remarks>Value for the OCTETSTRING may be as hex, as well as a constructed value.</remarks>
        /// <remarks>Constructed values consists of other OCTETSTRINGs</remarks>

        local.ASN1_CONSTRUCTED_value_block.call(this, arguments[0]);

        if(arguments[0] instanceof Object)
        {
            this.is_constructed = in_window.org.pkijs.getValue(arguments[0], "is_constructed", false);

            // #region Variables from hex_block type
            this.is_hex_only = in_window.org.pkijs.getValue(arguments[0], "is_hex_only", false);
            if("value_hex" in arguments[0])
                this.value_hex = util_copybuf(arguments[0].value_hex);
            else
                this.value_hex = new ArrayBuffer(0);
            // #endregion
        }
        else
        {
            this.is_constructed = false;

            // #region Variables from hex_block type
            this.is_hex_only = false;
            this.value_hex = new ArrayBuffer(0);
            // #endregion
        }
    }
    //**************************************************************************************
    local.OCTETSTRING_value_block.prototype = new local.ASN1_CONSTRUCTED_value_block();
    local.OCTETSTRING_value_block.constructor = local.OCTETSTRING_value_block;
    //**************************************************************************************
    local.OCTETSTRING_value_block.prototype.fromBER =
    function(input_buffer, input_offset, input_length)
    {
        /// <summary>Base function for converting block from BER encoded array of bytes</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array</param>
        /// <param name="input_offset" type="Number">Offset in ASN.1 BER encoded array where decoding should be started</param>
        /// <param name="input_length" type="Number">Maximum length of array of bytes which can be using in this function</param>

        var result_offset = 0;

        if(this.is_constructed == true)
        {
            this.is_hex_only = false;

            result_offset = local.ASN1_CONSTRUCTED_value_block.prototype.fromBER.call(this, input_buffer, input_offset, input_length);
            if(result_offset == (-1))
                return result_offset;

            for(var i = 0; i < this.value.length; i++)
            {
                var current_block_name = this.value[i].block_name();

                if(current_block_name == in_window.org.pkijs.asn1.EOC.prototype.block_name())
                {
                    if(this.is_indefinite_form == true)
                        break;
                    else
                    {
                        this.error = "EOC is unexpected, OCTET STRING may consists of OCTET STRINGs only";
                        return (-1);
                    }
                }

                if(current_block_name != in_window.org.pkijs.asn1.OCTETSTRING.prototype.block_name())
                {
                    this.error = "OCTET STRING may consists of OCTET STRINGs only";
                    return (-1);
                }
            }
        }
        else
        {
            this.is_hex_only = true;

            result_offset = local.hex_block.prototype.fromBER.call(this, input_buffer, input_offset, input_length);
            this.block_length = input_length;
        }

        return result_offset;
    }
    //**************************************************************************************
    local.OCTETSTRING_value_block.prototype.toBER =
    function(size_only)
    {
        /// <summary>Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)</summary>
        /// <param name="size_only" type="Boolean">Flag that we need only a size of encoding, not a real array of bytes</param>

        if(typeof size_only === "undefined")
            size_only = false;

        if(this.is_constructed === true)
            return local.ASN1_CONSTRUCTED_value_block.prototype.toBER.call(this, size_only);
        else
        {
            var ret_buf = new ArrayBuffer(this.value_hex.byteLength);

            if(size_only === true)
                return ret_buf;

            if(this.value_hex.byteLength == 0)
                return ret_buf;

            ret_buf = util_copybuf(this.value_hex);

            return ret_buf;
        }

        return (new ArrayBuffer(0));
    }
    //**************************************************************************************
    local.OCTETSTRING_value_block.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "OCTETSTRING_value_block";
    }
    //**************************************************************************************
    local.OCTETSTRING_value_block.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.ASN1_CONSTRUCTED_value_block.prototype.toJSON.call(this);

        _object.block_name = local.OCTETSTRING_value_block.prototype.block_name.call(this);
        _object.is_constructed = this.is_constructed;
        _object.is_hex_only = this.is_hex_only;
        _object.value_hex = in_window.org.pkijs.bufferToHexCodes(this.value_hex, 0, this.value_hex.byteLength)

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.OCTETSTRING =
    function()
    {
        in_window.org.pkijs.asn1.ASN1_block.call(this, arguments[0]);

        this.value_block = new local.OCTETSTRING_value_block(arguments[0]);

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 4; // OCTETSTRING
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.OCTETSTRING.prototype = new in_window.org.pkijs.asn1.ASN1_block();
    in_window.org.pkijs.asn1.OCTETSTRING.constructor = in_window.org.pkijs.asn1.OCTETSTRING;
    //**************************************************************************************
    in_window.org.pkijs.asn1.OCTETSTRING.prototype.fromBER =
    function(input_buffer, input_offset, input_length)
    {
        /// <summary>Base function for converting block from BER encoded array of bytes</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array</param>
        /// <param name="input_offset" type="Number">Offset in ASN.1 BER encoded array where decoding should be started</param>
        /// <param name="input_length" type="Number">Maximum length of array of bytes which can be using in this function</param>

        this.value_block.is_constructed = this.id_block.is_constructed;
        this.value_block.is_indefinite_form = this.len_block.is_indefinite_form;

        // #region Ability to encode empty OCTET STRING
        if(input_length == 0)
        {
            if(this.id_block.error.length == 0)
                this.block_length += this.id_block.block_length;

            if(this.len_block.error.length == 0)
                this.block_length += this.len_block.block_length;

            return input_offset;
        }
        // #endregion

        return in_window.org.pkijs.asn1.ASN1_block.prototype.fromBER.call(this, input_buffer, input_offset, input_length);
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.OCTETSTRING.prototype.block_name =
    function()
    {
        return "OCTETSTRING";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.OCTETSTRING.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = in_window.org.pkijs.asn1.ASN1_block.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.OCTETSTRING.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Declaration of ASN.1 BITSTRING type class
    //**************************************************************************************
    local.BITSTRING_value_block =
    function()
    {
        local.ASN1_CONSTRUCTED_value_block.call(this, arguments[0]);

        if(arguments[0] instanceof Object)
        {
            this.unused_bits = in_window.org.pkijs.getValue(arguments[0], "unused_bits", 0);
            this.is_constructed = in_window.org.pkijs.getValue(arguments[0], "is_constructed", false);

            // #region Variables from hex_block type
            this.is_hex_only = in_window.org.pkijs.getValue(arguments[0], "is_hex_only", false);

            if("value_hex" in arguments[0])
                this.value_hex = util_copybuf(arguments[0].value_hex);
            else
                this.value_hex = new ArrayBuffer(0);

            this.block_length = this.value_hex.byteLength;
            // #endregion
        }
        else
        {
            this.unused_bits = 0;
            this.is_constructed = false;

            // #region Variables from hex_block type
            this.is_hex_only = false;
            this.value_hex = new ArrayBuffer(0);
            // #endregion
        }
    }
    //**************************************************************************************
    local.BITSTRING_value_block.prototype = new local.ASN1_CONSTRUCTED_value_block();
    local.BITSTRING_value_block.constructor = local.BITSTRING_value_block;
    //**************************************************************************************
    local.BITSTRING_value_block.prototype.fromBER =
    function(input_buffer, input_offset, input_length)
    {
        /// <summary>Base function for converting block from BER encoded array of bytes</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array</param>
        /// <param name="input_offset" type="Number">Offset in ASN.1 BER encoded array where decoding should be started</param>
        /// <param name="input_length" type="Number">Maximum length of array of bytes which can be using in this function</param>

        // #region Ability to decode zero-length BITSTRING value
        if(input_length == 0)
            return input_offset;
        // #endregion

        var result_offset = (-1);

        // #region If the BISTRING supposed to be a constructed value
        if(this.is_constructed == true)
        {
            result_offset = local.ASN1_CONSTRUCTED_value_block.prototype.fromBER.call(this, input_buffer, input_offset, input_length);
            if(result_offset == (-1))
                return result_offset;

            for(var i = 0; i < this.value.length; i++)
            {
                var current_block_name = this.value[i].block_name();

                if(current_block_name == in_window.org.pkijs.asn1.EOC.prototype.block_name())
                {
                    if(this.is_indefinite_form == true)
                        break;
                    else
                    {
                        this.error = "EOC is unexpected, BIT STRING may consists of BIT STRINGs only";
                        return (-1);
                    }
                }

                if(current_block_name != in_window.org.pkijs.asn1.BITSTRING.prototype.block_name())
                {
                    this.error = "BIT STRING may consists of BIT STRINGs only";
                    return (-1);
                }

                if((this.unused_bits > 0) && (this.value[i].unused_bits > 0))
                {
                    this.error = "Usign of \"unused bits\" inside constructive BIT STRING allowed for least one only";
                    return (-1);
                }
                else
                {
                    this.unused_bits = this.value[i].unused_bits;
                    if(this.unused_bits > 7)
                    {
                        this.error = "Unused bits for BITSTRING must be in range 0-7";
                        return (-1);
                    }
                }
            }

            return result_offset;
        }
            // #endregion
        // #region If the BITSTRING supposed to be a primitive value
        else
        {
            // #region Basic check for parameters
            if(check_buffer_params.call(this, input_buffer, input_offset, input_length) === false)
                return (-1);
            // #endregion

            var int_buffer = new Uint8Array(input_buffer, input_offset, input_length);

            this.unused_bits = int_buffer[0];
            if(this.unused_bits > 7)
            {
                this.error = "Unused bits for BITSTRING must be in range 0-7";
                return (-1);
            }

            // #region Copy input buffer to internal buffer
            this.value_hex = new ArrayBuffer(int_buffer.length - 1);
            var view = new Uint8Array(this.value_hex);
            for(var i = 0; i < (input_length - 1) ; i++)
                view[i] = int_buffer[i + 1];
            // #endregion

            this.block_length = int_buffer.length;

            return (input_offset + input_length);
        }
        // #endregion
    }
    //**************************************************************************************
    local.BITSTRING_value_block.prototype.toBER =
    function(size_only)
    {
        /// <summary>Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)</summary>
        /// <param name="size_only" type="Boolean">Flag that we need only a size of encoding, not a real array of bytes</param>

        if(typeof size_only === "undefined")
            size_only = false;

        if(this.is_constructed === true)
            return local.ASN1_CONSTRUCTED_value_block.prototype.toBER.call(this, size_only);
        else
        {
            if(size_only === true)
                return (new ArrayBuffer(this.value_hex.byteLength + 1));

            if(this.value_hex.byteLength == 0)
                return (new ArrayBuffer(0));

            var cur_view = new Uint8Array(this.value_hex);

            var ret_buf = new ArrayBuffer(this.value_hex.byteLength + 1);
            var ret_view = new Uint8Array(ret_buf);

            ret_view[0] = this.unused_bits;

            for(var i = 0; i < this.value_hex.byteLength; i++)
                ret_view[i + 1] = cur_view[i];

            return ret_buf;
        }

        return (new ArrayBuffer(0));
    }
    //**************************************************************************************
    local.BITSTRING_value_block.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "BITSTRING_value_block";
    }
    //**************************************************************************************
    local.BITSTRING_value_block.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.ASN1_CONSTRUCTED_value_block.prototype.toJSON.call(this);

        _object.block_name = local.BITSTRING_value_block.prototype.block_name.call(this);
        _object.unused_bits = this.unused_bits;
        _object.is_constructed = this.is_constructed;
        _object.is_hex_only = this.is_hex_only;
        _object.value_hex = in_window.org.pkijs.bufferToHexCodes(this.value_hex, 0, this.value_hex.byteLength)

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.BITSTRING =
    function()
    {
        in_window.org.pkijs.asn1.ASN1_block.call(this, arguments[0]);

        this.value_block = new local.BITSTRING_value_block(arguments[0]);

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 3; // BITSTRING
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.BITSTRING.prototype = new in_window.org.pkijs.asn1.ASN1_block();
    in_window.org.pkijs.asn1.BITSTRING.constructor = in_window.org.pkijs.asn1.BITSTRING;
    //**************************************************************************************
    in_window.org.pkijs.asn1.BITSTRING.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "BITSTRING";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.BITSTRING.prototype.fromBER =
    function(input_buffer, input_offset, input_length)
    {
        /// <summary>Base function for converting block from BER encoded array of bytes</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array</param>
        /// <param name="input_offset" type="Number">Offset in ASN.1 BER encoded array where decoding should be started</param>
        /// <param name="input_length" type="Number">Maximum length of array of bytes which can be using in this function</param>

        // #region Ability to encode empty BITSTRING
        if(input_length == 0)
            return input_offset;
        // #endregion

        this.value_block.is_constructed = this.id_block.is_constructed;
        this.value_block.is_indefinite_form = this.len_block.is_indefinite_form;

        return in_window.org.pkijs.asn1.ASN1_block.prototype.fromBER.call(this, input_buffer, input_offset, input_length);
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.BITSTRING.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = in_window.org.pkijs.asn1.ASN1_block.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.BITSTRING.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Declaration of ASN.1 INTEGER type class
    //**************************************************************************************
    local.INTEGER_value_block =
    function()
    {
        local.value_block.call(this, arguments[0]);

        if(arguments[0] instanceof Object)
        {
            this.value_dec = in_window.org.pkijs.getValue(arguments[0], "value", 0);

            // #region Variables from hex_block type
            this.is_hex_only = in_window.org.pkijs.getValue(arguments[0], "is_hex_only", false);
            if("value_hex" in arguments[0])
            {
                this.value_hex = util_copybuf(arguments[0].value_hex);

                if(this.value_hex.byteLength >= 4) // Dummy's protection
                    this.is_hex_only = true;
                else
                    this.value_dec = util_decode_tc.call(this);
            }
            else
                this.value_hex = util_encode_tc(this.value_dec);
            // #endregion
        }
        else
        {
            this.value_dec = 0;

            // #region Variables from hex_block type
            this.is_hex_only = false;
            this.value_hex = new ArrayBuffer(0);
            // #endregion
        }
    }
    //**************************************************************************************
    local.INTEGER_value_block.prototype = new local.value_block();
    local.INTEGER_value_block.constructor = local.INTEGER_value_block;
    //**************************************************************************************
    local.INTEGER_value_block.prototype.fromBER =
    function(input_buffer, input_offset, input_length)
    {
        /// <summary>Base function for converting block from BER encoded array of bytes</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array</param>
        /// <param name="input_offset" type="Number">Offset in ASN.1 BER encoded array where decoding should be started</param>
        /// <param name="input_length" type="Number">Maximum length of array of bytes which can be using in this function</param>

        var result_offset = local.hex_block.prototype.fromBER.call(this, input_buffer, input_offset, input_length);
        if(result_offset == (-1))
            return result_offset;

        if(this.value_hex.byteLength > 4) // In JavaScript we can effectively work with 32-bit integers only
        {
            this.warnings.push("Too big INTEGER for decoding, hex only");
            this.is_hex_only = true;
        }
        else
            this.value_dec = util_decode_tc.call(this);

        this.block_length = input_length;

        return (input_offset + input_length);
    }
    //**************************************************************************************
    local.INTEGER_value_block.prototype.toBER =
    function(size_only)
    {
        /// <summary>Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)</summary>
        /// <param name="size_only" type="Boolean">Flag that we need only a size of encoding, not a real array of bytes</param>

        if(typeof size_only === "undefined")
            size_only = false;

        if(this.is_hex_only === false)
        {
            var encoded_buf = util_encode_tc(this.value_dec);
            if(encoded_buf.byteLength == 0)
            {
                this.error = "Error during encoding INTEGER value";
                return (new ArrayBuffer(0));
            }

            return util_copybuf(encoded_buf);
        }
        else
            return util_copybuf(this.value_hex);

        return (new ArrayBuffer(0));
    }
    //**************************************************************************************
    local.INTEGER_value_block.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "INTEGER_value_block";
    }
    //**************************************************************************************
    local.INTEGER_value_block.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.value_block.prototype.toJSON.call(this);

        _object.block_name = local.INTEGER_value_block.prototype.block_name.call(this);
        _object.value_dec = this.value_dec;
        _object.is_hex_only = this.is_hex_only;
        _object.value_hex = in_window.org.pkijs.bufferToHexCodes(this.value_hex, 0, this.value_hex.byteLength)

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.INTEGER =
    function()
    {
        in_window.org.pkijs.asn1.ASN1_block.call(this, arguments[0]);

        this.value_block = new local.INTEGER_value_block(arguments[0]);

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 2; // INTEGER
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.INTEGER.prototype = new in_window.org.pkijs.asn1.ASN1_block();
    in_window.org.pkijs.asn1.INTEGER.constructor = in_window.org.pkijs.asn1.INTEGER;
    //**************************************************************************************
    in_window.org.pkijs.asn1.INTEGER.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "INTEGER";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.INTEGER.prototype.isEqual =
    function()
    {
        /// <summary>Compare two INTEGER object, or INTEGER and ArrayBuffer objects</summary>
        /// <returns type="Boolean"></returns>

        if(arguments[0] instanceof in_window.org.pkijs.asn1.INTEGER)
        {
            if(this.value_block.is_hex_only && arguments[0].value_block.is_hex_only) // Compare two ArrayBuffers
                return in_window.org.pkijs.isEqual_buffer(this.value_block.value_hex, arguments[0].value_block.value_hex);
            else
            {
                if(this.value_block.is_hex_only === arguments[0].value_block.is_hex_only)
                    return (this.value_block.value_dec == arguments[0].value_block.value_dec);
                else
                    return false;
            }
        }
        else
        {
            if(arguments[0] instanceof ArrayBuffer)
                return in_window.org.pkijs.isEqual_buffer(this.value_block.value_hex, arguments[0].value_block.value_hex);
            else
                return false;
        }

        return false;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.INTEGER.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = in_window.org.pkijs.asn1.ASN1_block.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.INTEGER.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Declaration of ASN.1 ENUMERATED type class
    //**************************************************************************************
    in_window.org.pkijs.asn1.ENUMERATED =
    function()
    {
        in_window.org.pkijs.asn1.INTEGER.call(this, arguments[0]);

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 10; // ENUMERATED
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.ENUMERATED.prototype = new in_window.org.pkijs.asn1.INTEGER();
    in_window.org.pkijs.asn1.ENUMERATED.constructor = in_window.org.pkijs.asn1.ENUMERATED;
    //**************************************************************************************
    in_window.org.pkijs.asn1.ENUMERATED.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "ENUMERATED";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.ENUMERATED.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = in_window.org.pkijs.asn1.INTEGER.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.ENUMERATED.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Declaration of ASN.1 OBJECT IDENTIFIER type class
    //**************************************************************************************
    local.SID_value_block =
    function()
    {
        local.hex_block.call(this, arguments[0]);

        if(arguments[0] instanceof Object)
        {
            this.value_dec = in_window.org.pkijs.getValue(arguments[0], "value_dec", -1);
            this.is_first_sid = in_window.org.pkijs.getValue(arguments[0], "is_first_sid", false);
        }
        else
        {
            this.value_dec = (-1);
            this.is_first_sid = false;
        }
    }
    //**************************************************************************************
    local.SID_value_block.prototype = new local.hex_block();
    local.SID_value_block.constructor = local.SID_value_block;
    //**************************************************************************************
    local.SID_value_block.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "sid_block";
    }
    //**************************************************************************************
    local.SID_value_block.prototype.fromBER =
    function(input_buffer, input_offset, input_length)
    {
        /// <summary>Base function for converting block from BER encoded array of bytes</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array</param>
        /// <param name="input_offset" type="Number">Offset in ASN.1 BER encoded array where decoding should be started</param>
        /// <param name="input_length" type="Number">Maximum length of array of bytes which can be using in this function</param>

        if(input_length == 0)
            return input_offset;

        // #region Basic check for parameters
        if(check_buffer_params.call(this, input_buffer, input_offset, input_length) === false)
            return (-1);
        // #endregion

        var int_buffer = new Uint8Array(input_buffer, input_offset, input_length);

        this.value_hex = new ArrayBuffer(input_length);
        var view = new Uint8Array(this.value_hex);

        for(var i = 0; i < input_length; i++)
        {
            view[i] = int_buffer[i] & 0x7F;

            this.block_length++;

            if((int_buffer[i] & 0x80) == 0x00)
                break;
        }

        // #region Ajust size of value_hex buffer
        var temp_value_hex = new ArrayBuffer(this.block_length);
        var temp_view = new Uint8Array(temp_value_hex);

        for(var i = 0; i < this.block_length; i++)
            temp_view[i] = view[i];

        this.value_hex = util_copybuf(temp_value_hex);
        view = new Uint8Array(this.value_hex);
        // #endregion

        if((int_buffer[this.block_length - 1] & 0x80) != 0x00)
        {
            this.error = "End of input reached before message was fully decoded";
            return (-1);
        }

        if(view[0] == 0x00)
            this.warnings.push("Needlessly long format of SID encoding");

        if(this.block_length <= 8)
            this.value_dec = util_frombase(view, 7);
        else
        {
            this.is_hex_only = true;
            this.warnings.push("Too big SID for decoding, hex only");
        }

        return (input_offset + this.block_length);
    }
    //**************************************************************************************
    local.SID_value_block.prototype.toBER =
    function(size_only)
    {
        /// <summary>Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)</summary>
        /// <param name="size_only" type="Boolean">Flag that we need only a size of encoding, not a real array of bytes</param>

        if(typeof size_only === "undefined")
            size_only = false;

        if(this.is_hex_only)
        {
            if(size_only === true)
                return (new ArrayBuffer(this.value_hex.byteLength));

            var cur_view = new Uint8Array(this.value_hex);

            var ret_buf = new ArrayBuffer(this.block_length);
            var ret_view = new Uint8Array(ret_buf);

            for(var i = 0; i < ( this.block_length - 1 ); i++ )
                ret_view[i] = cur_view[i] | 0x80;

            ret_view[this.block_length - 1] = cur_view[this.block_length - 1];
        }

        var encoded_buf = util_tobase(this.value_dec, 7);
        if(encoded_buf.byteLength === 0)
        {
            this.error = "Error during encoding SID value";
            return (new ArrayBuffer(0));
        }

        var ret_buf = new ArrayBuffer(encoded_buf.byteLength);

        if(size_only === false)
        {
            var encoded_view = new Uint8Array(encoded_buf);
            var ret_view = new Uint8Array(ret_buf);

            for(var i = 0; i < (encoded_buf.byteLength - 1) ; i++)
                ret_view[i] = encoded_view[i] | 0x80;

            ret_view[encoded_buf.byteLength - 1] = encoded_view[encoded_buf.byteLength - 1];
        }

        return ret_buf;
    }
    //**************************************************************************************
    local.SID_value_block.prototype.toString =
    function()
    {
        var result = "";

        if(this.is_hex_only === true)
            result = to_hex_codes(this.value_hex);
        else
        {
            if(this.is_first_sid)
            {
                var sid_value = this.value_dec;

                if(this.value_dec <= 39)
                    result = "0.";
                else
                {
                    if(this.value_dec <= 79)
                    {
                        result = "1.";
                        sid_value -= 40;
                    }
                    else
                    {
                        result = "2.";
                        sid_value -= 80;
                    }
                }

                result = result + sid_value.toString();
            }
            else
                result = this.value_dec.toString();
        }

        return result;
    }
    //**************************************************************************************
    local.SID_value_block.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.hex_block.prototype.toJSON.call(this);

        _object.block_name = local.SID_value_block.prototype.block_name.call(this);
        _object.value_dec = this.value_dec;
        _object.is_first_sid = this.is_first_sid;

        return _object;
    }
    //**************************************************************************************
    local.OID_value_block =
    function()
    {
        local.value_block.call(this, arguments[0]);

        this.value = new Array();

        if(arguments[0] instanceof Object)
            this.fromString(in_window.org.pkijs.getValue(arguments[0], "value", ""));
    }
    //**************************************************************************************
    local.OID_value_block.prototype = new local.value_block();
    local.OID_value_block.constructor = local.OID_value_block;
    //**************************************************************************************
    local.OID_value_block.prototype.fromBER =
    function(input_buffer, input_offset, input_length)
    {
        /// <summary>Base function for converting block from BER encoded array of bytes</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array</param>
        /// <param name="input_offset" type="Number">Offset in ASN.1 BER encoded array where decoding should be started</param>
        /// <param name="input_length" type="Number">Maximum length of array of bytes which can be using in this function</param>

        var result_offset = input_offset;

        while(input_length > 0)
        {
            var sid_block = new local.SID_value_block();
            result_offset = sid_block.fromBER(input_buffer, result_offset, input_length);
            if(result_offset == (-1))
            {
                this.block_length = 0;
                this.error = sid_block.error;
                return result_offset;
            }

            if(this.value.length == 0)
                sid_block.is_first_sid = true;

            this.block_length += sid_block.block_length;
            input_length -= sid_block.block_length;

            this.value.push(sid_block);
        }

        return result_offset;
    }
    //**************************************************************************************
    local.OID_value_block.prototype.toBER =
    function(size_only)
    {
        /// <summary>Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)</summary>
        /// <param name="size_only" type="Boolean">Flag that we need only a size of encoding, not a real array of bytes</param>

        if(typeof size_only === "undefined")
            size_only = false;

        var ret_buf = new ArrayBuffer(0);

        for(var i = 0; i < this.value.length; i++)
        {
            var value_buf = this.value[i].toBER(size_only);
            if(value_buf.byteLength === 0)
            {
                this.error = this.value[i].error;
                return (new ArrayBuffer(0));
            }

            ret_buf = util_concatbuf(ret_buf, value_buf);
        }

        return ret_buf;
    }
    //**************************************************************************************
    local.OID_value_block.prototype.fromString =
    function(str)
    {
        this.value = new Array(); // Clear existing SID values

        var pos1 = 0;
        var pos2 = 0;

        var sid = "";

        var flag = false;

        do
        {
            pos2 = str.indexOf('.', pos1);
            if(pos2 === (-1))
                sid = str.substr(pos1);
            else
                sid = str.substr(pos1, pos2 - pos1);

            pos1 = pos2 + 1;

            if(flag)
            {
                var sid_block = this.value[0];

                var plus = 0;

                switch(sid_block.value_dec)
                {
                    case 0:
                        break;
                    case 1:
                        plus = 40;
                        break;
                    case 2:
                        plus = 80;
                        break;
                    default:
                        this.value = new Array(); // clear SID array
                        return false; // ???
                }

                var parsedSID = parseInt(sid, 10);
                if(Number.isNaN(parsedSID))
                    return true;

                sid_block.value_dec = parsedSID + plus;

                flag = false;
            }
            else
            {
                var sid_block = new local.SID_value_block();
                sid_block.value_dec = parseInt(sid, 10);
                if(Number.isNaN(sid_block.value_dec))
                    return true;

                if(this.value.length === 0)
                {
                    sid_block.is_first_sid = true;
                    flag = true;
                }

                this.value.push(sid_block);
            }

        } while(pos2 !== (-1));

        return true;
    }
    //**************************************************************************************
    local.OID_value_block.prototype.toString =
    function()
    {
        var result = "";
        var is_hex_only = false;

        for(var i = 0; i < this.value.length; i++)
        {
            is_hex_only = this.value[i].is_hex_only;

            var sid_str = this.value[i].toString();

            if(i !== 0)
                result = result + ".";

            if(is_hex_only)
            {
                sid_str = "{" + sid_str + "}";

                if(this.value[i].is_first_sid)
                    result = "2.{" + sid_str + " - 80}";
                else
                    result = result + sid_str;
            }
            else
                result = result + sid_str;
        }

        return result;
    }
    //**************************************************************************************
    local.OID_value_block.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "OID_value_block";
    }
    //**************************************************************************************
    local.OID_value_block.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.value_block.prototype.toJSON.call(this);

        _object.block_name = local.OID_value_block.prototype.block_name.call(this);
        _object.value = local.OID_value_block.prototype.toString.call(this);
        _object.sid_array = new Array();
        for(var i = 0; i < this.value.length; i++)
            _object.sid_array.push(this.value[i].toJSON());

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.OID =
    function()
    {
        in_window.org.pkijs.asn1.ASN1_block.call(this, arguments[0]);

        this.value_block = new local.OID_value_block(arguments[0]);

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 6; // OBJECT IDENTIFIER
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.OID.prototype = new in_window.org.pkijs.asn1.ASN1_block();
    in_window.org.pkijs.asn1.OID.constructor = in_window.org.pkijs.asn1.OID;
    //**************************************************************************************
    in_window.org.pkijs.asn1.OID.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "OID";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.OID.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = in_window.org.pkijs.asn1.ASN1_block.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.OID.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Declaration of all string's classes
    //**************************************************************************************
    local.UTF8STRING_value_block =
    function()
    {
        local.hex_block.call(this, arguments[0]);

        this.is_hex_only = true;
        this.value = ""; // String representation of decoded ArrayBuffer
    }
    //**************************************************************************************
    local.UTF8STRING_value_block.prototype = new local.hex_block();
    local.UTF8STRING_value_block.constructor = local.UTF8STRING_value_block;
    //**************************************************************************************
    local.UTF8STRING_value_block.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "UTF8STRING_value_block";
    }
    //**************************************************************************************
    local.UTF8STRING_value_block.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.hex_block.prototype.toJSON.call(this);

        _object.block_name = local.UTF8STRING_value_block.prototype.block_name.call(this);
        _object.value = this.value;

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.UTF8STRING =
    function()
    {
        in_window.org.pkijs.asn1.ASN1_block.call(this, arguments[0]);

        this.value_block = new local.UTF8STRING_value_block();

        if(arguments[0] instanceof Object)
        {
            if("value" in arguments[0])
                in_window.org.pkijs.asn1.UTF8STRING.prototype.fromString.call(this,arguments[0].value);
        }

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 12; // UTF8STRING
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.UTF8STRING.prototype = new in_window.org.pkijs.asn1.ASN1_block();
    in_window.org.pkijs.asn1.UTF8STRING.constructor = in_window.org.pkijs.asn1.UTF8STRING;
    //**************************************************************************************
    in_window.org.pkijs.asn1.UTF8STRING.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "UTF8STRING";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.UTF8STRING.prototype.fromBER =
    function(input_buffer, input_offset, input_length)
    {
        /// <summary>Base function for converting block from BER encoded array of bytes</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array</param>
        /// <param name="input_offset" type="Number">Offset in ASN.1 BER encoded array where decoding should be started</param>
        /// <param name="input_length" type="Number">Maximum length of array of bytes which can be using in this function</param>

        var result_offset = this.value_block.fromBER(input_buffer, input_offset, (this.len_block.is_indefinite_form == true) ? input_length : this.len_block.length);
        if(result_offset == (-1))
        {
            this.error = this.value_block.error;
            return result_offset;
        }

        in_window.org.pkijs.asn1.UTF8STRING.prototype.fromBuffer.call(this, this.value_block.value_hex);

        if(this.id_block.error.length == 0)
            this.block_length += this.id_block.block_length;

        if(this.len_block.error.length == 0)
            this.block_length += this.len_block.block_length;

        if(this.value_block.error.length == 0)
            this.block_length += this.value_block.block_length;

        return result_offset;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.UTF8STRING.prototype.fromBuffer =
    function(input_buffer)
    {
        /// <param name="input_buffer" type="ArrayBuffer">Array with encoded string</param>
        this.value_block.value = String.fromCharCode.apply(null, new Uint8Array(input_buffer));

        try
        {
            this.value_block.value = decodeURIComponent(escape(this.value_block.value));
        }
        catch(ex)
        {
            this.warnings.push("Error during \"decodeURIComponent\": " + ex + ", using raw string");
        }
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.UTF8STRING.prototype.fromString =
    function(input_string)
    {
        /// <param name="input_string" type="String">String with UNIVERSALSTRING value</param>

        var str = unescape(encodeURIComponent(input_string));
        var str_len = str.length;

        this.value_block.value_hex = new ArrayBuffer(str_len);
        var view = new Uint8Array(this.value_block.value_hex);

        for(var i = 0; i < str_len; i++)
            view[i] = str.charCodeAt(i);

        this.value_block.value = input_string;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.UTF8STRING.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = in_window.org.pkijs.asn1.ASN1_block.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.UTF8STRING.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    local.BMPSTRING_value_block =
    function()
    {
        local.hex_block.call(this, arguments[0]);

        this.is_hex_only = true;
        this.value = "";
    }
    //**************************************************************************************
    local.BMPSTRING_value_block.prototype = new local.hex_block();
    local.BMPSTRING_value_block.constructor = local.BMPSTRING_value_block;
    //**************************************************************************************
    local.BMPSTRING_value_block.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "BMPSTRING_value_block";
    }
    //**************************************************************************************
    local.BMPSTRING_value_block.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.hex_block.prototype.toJSON.call(this);

        _object.block_name = local.BMPSTRING_value_block.prototype.block_name.call(this);
        _object.value = this.value;

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.BMPSTRING =
    function()
    {
        in_window.org.pkijs.asn1.ASN1_block.call(this, arguments[0]);

        this.value_block = new local.BMPSTRING_value_block();

        if(arguments[0] instanceof Object)
        {
            if("value" in arguments[0])
                in_window.org.pkijs.asn1.BMPSTRING.prototype.fromString.call(this, arguments[0].value);
        }

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 30; // BMPSTRING
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.BMPSTRING.prototype = new in_window.org.pkijs.asn1.ASN1_block();
    in_window.org.pkijs.asn1.BMPSTRING.constructor = in_window.org.pkijs.asn1.BMPSTRING;
    //**************************************************************************************
    in_window.org.pkijs.asn1.BMPSTRING.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "BMPSTRING";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.BMPSTRING.prototype.fromBER =
    function(input_buffer, input_offset, input_length)
    {
        /// <summary>Base function for converting block from BER encoded array of bytes</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array</param>
        /// <param name="input_offset" type="Number">Offset in ASN.1 BER encoded array where decoding should be started</param>
        /// <param name="input_length" type="Number">Maximum length of array of bytes which can be using in this function</param>

        var result_offset = this.value_block.fromBER(input_buffer, input_offset, (this.len_block.is_indefinite_form == true) ? input_length : this.len_block.length);
        if(result_offset == (-1))
        {
            this.error = this.value_block.error;
            return result_offset;
        }

        in_window.org.pkijs.asn1.BMPSTRING.prototype.fromBuffer.call(this, this.value_block.value_hex);

        if(this.id_block.error.length == 0)
            this.block_length += this.id_block.block_length;

        if(this.len_block.error.length == 0)
            this.block_length += this.len_block.block_length;

        if(this.value_block.error.length == 0)
            this.block_length += this.value_block.block_length;

        return result_offset;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.BMPSTRING.prototype.fromBuffer =
    function(input_buffer)
    {
        /// <param name="input_buffer" type="ArrayBuffer">Array with encoded string</param>

        var copy_buffer = in_window.org.pkijs.copyBuffer(input_buffer);

        var value_view = new Uint8Array(copy_buffer);

        for(var i = 0; i < value_view.length; i = i + 2)
        {
            var temp = value_view[i];

            value_view[i] = value_view[i + 1];
            value_view[i + 1] = temp;
        }

        this.value_block.value = String.fromCharCode.apply(null, new Uint16Array(copy_buffer));
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.BMPSTRING.prototype.fromString =
    function(input_string)
    {
        /// <param name="input_string" type="String">String with UNIVERSALSTRING value</param>

        var str_length = input_string.length;

        this.value_block.value_hex = new ArrayBuffer(str_length * 2);
        var value_hex_view = new Uint8Array(this.value_block.value_hex);

        for(var i = 0; i < str_length; i++)
        {
            var code_buf = util_tobase(input_string.charCodeAt(i), 8);
            var code_view = new Uint8Array(code_buf);
            if(code_view.length > 2)
                continue;

            var dif = 2 - code_view.length;

            for(var j = (code_view.length - 1) ; j >= 0; j--)
                value_hex_view[i * 2 + j + dif] = code_view[j];
        }

        this.value_block.value = input_string;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.BMPSTRING.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = in_window.org.pkijs.asn1.ASN1_block.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.BMPSTRING.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    local.UNIVERSALSTRING_value_block =
    function()
    {
        local.hex_block.call(this, arguments[0]);

        this.is_hex_only = true;
        this.value = "";
    }
    //**************************************************************************************
    local.UNIVERSALSTRING_value_block.prototype = new local.hex_block();
    local.UNIVERSALSTRING_value_block.constructor = local.UNIVERSALSTRING_value_block;
    //**************************************************************************************
    local.UNIVERSALSTRING_value_block.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "UNIVERSALSTRING_value_block";
    }
    //**************************************************************************************
    local.UNIVERSALSTRING_value_block.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.hex_block.prototype.toJSON.call(this);

        _object.block_name = local.UNIVERSALSTRING_value_block.prototype.block_name.call(this);
        _object.value = this.value;

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.UNIVERSALSTRING =
    function()
    {
        in_window.org.pkijs.asn1.ASN1_block.call(this, arguments[0]);

        this.value_block = new local.UNIVERSALSTRING_value_block();

        if(arguments[0] instanceof Object)
        {
            if("value" in arguments[0])
                in_window.org.pkijs.asn1.UNIVERSALSTRING.prototype.fromString.call(this, arguments[0].value);
        }

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 28; // UNIVERSALSTRING
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.UNIVERSALSTRING.prototype = new in_window.org.pkijs.asn1.ASN1_block();
    in_window.org.pkijs.asn1.UNIVERSALSTRING.constructor = in_window.org.pkijs.asn1.UNIVERSALSTRING;
    //**************************************************************************************
    in_window.org.pkijs.asn1.UNIVERSALSTRING.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "UNIVERSALSTRING";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.UNIVERSALSTRING.prototype.fromBER =
    function(input_buffer, input_offset, input_length)
    {
        /// <summary>Base function for converting block from BER encoded array of bytes</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array</param>
        /// <param name="input_offset" type="Number">Offset in ASN.1 BER encoded array where decoding should be started</param>
        /// <param name="input_length" type="Number">Maximum length of array of bytes which can be using in this function</param>

        var result_offset = this.value_block.fromBER(input_buffer, input_offset, (this.len_block.is_indefinite_form == true) ? input_length : this.len_block.length);
        if(result_offset == (-1))
        {
            this.error = this.value_block.error;
            return result_offset;
        }

        in_window.org.pkijs.asn1.UNIVERSALSTRING.prototype.fromBuffer.call(this, this.value_block.value_hex);

        if(this.id_block.error.length == 0)
            this.block_length += this.id_block.block_length;

        if(this.len_block.error.length == 0)
            this.block_length += this.len_block.block_length;

        if(this.value_block.error.length == 0)
            this.block_length += this.value_block.block_length;

        return result_offset;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.UNIVERSALSTRING.prototype.fromBuffer =
    function(input_buffer)
    {
        /// <param name="input_buffer" type="ArrayBuffer">Array with encoded string</param>

        var copy_buffer = in_window.org.pkijs.copyBuffer(input_buffer);

        var value_view = new Uint8Array(copy_buffer);

        for(var i = 0; i < value_view.length; i = i + 4)
        {
            value_view[i] = value_view[i + 3];
            value_view[i + 1] = value_view[i + 2];
            value_view[i + 2] = 0x00;
            value_view[i + 3] = 0x00;
        }

        this.value_block.value = String.fromCharCode.apply(null, new Uint32Array(copy_buffer));
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.UNIVERSALSTRING.prototype.fromString =
    function(input_string)
    {
        /// <param name="input_string" type="String">String with UNIVERSALSTRING value</param>

        var str_length = input_string.length;

        this.value_block.value_hex = new ArrayBuffer(str_length * 4);
        var value_hex_view = new Uint8Array(this.value_block.value_hex);

        for(var i = 0; i < str_length; i++)
        {
            var code_buf = util_tobase(input_string.charCodeAt(i), 8);
            var code_view = new Uint8Array(code_buf);
            if(code_view.length > 4)
                continue;

            var dif = 4 - code_view.length;

            for(var j = (code_view.length - 1) ; j >= 0; j--)
                value_hex_view[i*4 + j + dif] = code_view[j];
        }

        this.value_block.value = input_string;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.UNIVERSALSTRING.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = in_window.org.pkijs.asn1.ASN1_block.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.UNIVERSALSTRING.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    local.SIMPLESTRING_value_block =
    function()
    {
        local.hex_block.call(this, arguments[0]);

        /// <field type="String">Native string representation</field>
        this.value = "";
        this.is_hex_only = true;
    }
    //**************************************************************************************
    local.SIMPLESTRING_value_block.prototype = new local.hex_block();
    local.SIMPLESTRING_value_block.constructor = local.SIMPLESTRING_value_block;
    //**************************************************************************************
    local.SIMPLESTRING_value_block.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "SIMPLESTRING_value_block";
    }
    //**************************************************************************************
    local.SIMPLESTRING_value_block.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.hex_block.prototype.toJSON.call(this);

        _object.block_name = local.SIMPLESTRING_value_block.prototype.block_name.call(this);
        _object.value = this.value;

        return _object;
    }
    //**************************************************************************************
    local.SIMPLESTRING_block =
    function()
    {
        in_window.org.pkijs.asn1.ASN1_block.call(this, arguments[0]);

        this.value_block = new local.SIMPLESTRING_value_block();

        if(arguments[0] instanceof Object)
        {
            if("value" in arguments[0])
                local.SIMPLESTRING_block.prototype.fromString.call(this, arguments[0].value);
        }
    }
    //**************************************************************************************
    local.SIMPLESTRING_block.prototype = new in_window.org.pkijs.asn1.ASN1_block();
    local.SIMPLESTRING_block.constructor = local.SIMPLESTRING_block;
    //**************************************************************************************
    local.SIMPLESTRING_block.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "SIMPLESTRING";
    }
    //**************************************************************************************
    local.SIMPLESTRING_block.prototype.fromBER =
    function(input_buffer, input_offset, input_length)
    {
        /// <summary>Base function for converting block from BER encoded array of bytes</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array</param>
        /// <param name="input_offset" type="Number">Offset in ASN.1 BER encoded array where decoding should be started</param>
        /// <param name="input_length" type="Number">Maximum length of array of bytes which can be using in this function</param>

        var result_offset = this.value_block.fromBER(input_buffer, input_offset, (this.len_block.is_indefinite_form == true) ? input_length : this.len_block.length);
        if(result_offset == (-1))
        {
            this.error = this.value_block.error;
            return result_offset;
        }

        local.SIMPLESTRING_block.prototype.fromBuffer.call(this, this.value_block.value_hex);

        if(this.id_block.error.length == 0)
            this.block_length += this.id_block.block_length;

        if(this.len_block.error.length == 0)
            this.block_length += this.len_block.block_length;

        if(this.value_block.error.length == 0)
            this.block_length += this.value_block.block_length;

        return result_offset;
    }
    //**************************************************************************************
    local.SIMPLESTRING_block.prototype.fromBuffer =
    function(input_buffer)
    {
        /// <param name="input_buffer" type="ArrayBuffer">Array with encoded string</param>

        this.value_block.value = String.fromCharCode.apply(null, new Uint8Array(input_buffer));
    }
    //**************************************************************************************
    local.SIMPLESTRING_block.prototype.fromString =
    function(input_string)
    {
        /// <param name="input_string" type="String">String with UNIVERSALSTRING value</param>
        var str_len = input_string.length;

        this.value_block.value_hex = new ArrayBuffer(str_len);
        var view = new Uint8Array(this.value_block.value_hex);

        for(var i = 0; i < str_len; i++)
            view[i] = input_string.charCodeAt(i);

        this.value_block.value = input_string;
    }
    //**************************************************************************************
    local.SIMPLESTRING_block.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = in_window.org.pkijs.asn1.ASN1_block.prototype.toJSON.call(this);

        _object.block_name = local.SIMPLESTRING_block.prototype.block_name.call(this);
        _object.block_name = local.value_block.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.NUMERICSTRING =
    function()
    {
        local.SIMPLESTRING_block.call(this, arguments[0]);

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 18; // NUMERICSTRING
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.NUMERICSTRING.prototype = new local.SIMPLESTRING_block();
    in_window.org.pkijs.asn1.NUMERICSTRING.constructor = in_window.org.pkijs.asn1.NUMERICSTRING;
    //**************************************************************************************
    in_window.org.pkijs.asn1.NUMERICSTRING.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "NUMERICSTRING";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.NUMERICSTRING.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.SIMPLESTRING_block.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.NUMERICSTRING.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.PRINTABLESTRING =
    function()
    {
        local.SIMPLESTRING_block.call(this, arguments[0]);

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 19; // PRINTABLESTRING
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.PRINTABLESTRING.prototype = new local.SIMPLESTRING_block();
    in_window.org.pkijs.asn1.PRINTABLESTRING.constructor = in_window.org.pkijs.asn1.PRINTABLESTRING;
    //**************************************************************************************
    in_window.org.pkijs.asn1.PRINTABLESTRING.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "PRINTABLESTRING";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.PRINTABLESTRING.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.SIMPLESTRING_block.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.PRINTABLESTRING.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.TELETEXSTRING =
    function()
    {
        local.SIMPLESTRING_block.call(this, arguments[0]);

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 20; // TELETEXSTRING
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.TELETEXSTRING.prototype = new local.SIMPLESTRING_block();
    in_window.org.pkijs.asn1.TELETEXSTRING.constructor = in_window.org.pkijs.asn1.TELETEXSTRING;
    //**************************************************************************************
    in_window.org.pkijs.asn1.TELETEXSTRING.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "TELETEXSTRING";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.TELETEXSTRING.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.SIMPLESTRING_block.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.TELETEXSTRING.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.VIDEOTEXSTRING =
    function()
    {
        local.SIMPLESTRING_block.call(this, arguments[0]);

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 21; // VIDEOTEXSTRING
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.VIDEOTEXSTRING.prototype = new local.SIMPLESTRING_block();
    in_window.org.pkijs.asn1.VIDEOTEXSTRING.constructor = in_window.org.pkijs.asn1.VIDEOTEXSTRING;
    //**************************************************************************************
    in_window.org.pkijs.asn1.VIDEOTEXSTRING.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "VIDEOTEXSTRING";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.VIDEOTEXSTRING.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.SIMPLESTRING_block.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.VIDEOTEXSTRING.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.IA5STRING =
    function()
    {
        local.SIMPLESTRING_block.call(this, arguments[0]);

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 22; // IA5STRING
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.IA5STRING.prototype = new local.SIMPLESTRING_block();
    in_window.org.pkijs.asn1.IA5STRING.constructor = in_window.org.pkijs.asn1.IA5STRING;
    //**************************************************************************************
    in_window.org.pkijs.asn1.IA5STRING.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "IA5STRING";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.IA5STRING.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.SIMPLESTRING_block.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.IA5STRING.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.GRAPHICSTRING =
    function()
    {
        local.SIMPLESTRING_block.call(this, arguments[0]);

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 25; // GRAPHICSTRING
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.GRAPHICSTRING.prototype = new local.SIMPLESTRING_block();
    in_window.org.pkijs.asn1.GRAPHICSTRING.constructor = in_window.org.pkijs.asn1.GRAPHICSTRING;
    //**************************************************************************************
    in_window.org.pkijs.asn1.GRAPHICSTRING.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "GRAPHICSTRING";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.GRAPHICSTRING.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.SIMPLESTRING_block.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.GRAPHICSTRING.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.VISIBLESTRING =
    function()
    {
        local.SIMPLESTRING_block.call(this, arguments[0]);

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 26; // VISIBLESTRING
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.VISIBLESTRING.prototype = new local.SIMPLESTRING_block();
    in_window.org.pkijs.asn1.VISIBLESTRING.constructor = in_window.org.pkijs.asn1.VISIBLESTRING;
    //**************************************************************************************
    in_window.org.pkijs.asn1.VISIBLESTRING.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "VISIBLESTRING";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.VISIBLESTRING.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.SIMPLESTRING_block.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.VISIBLESTRING.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.GENERALSTRING =
    function()
    {
        local.SIMPLESTRING_block.call(this, arguments[0]);

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 27; // GENERALSTRING
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.GENERALSTRING.prototype = new local.SIMPLESTRING_block();
    in_window.org.pkijs.asn1.GENERALSTRING.constructor = in_window.org.pkijs.asn1.GENERALSTRING;
    //**************************************************************************************
    in_window.org.pkijs.asn1.GENERALSTRING.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "GENERALSTRING";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.GENERALSTRING.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.SIMPLESTRING_block.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.GENERALSTRING.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.CHARACTERSTRING =
    function()
    {
        local.SIMPLESTRING_block.call(this, arguments[0]);

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 29; // CHARACTERSTRING
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.CHARACTERSTRING.prototype = new local.SIMPLESTRING_block();
    in_window.org.pkijs.asn1.CHARACTERSTRING.constructor = in_window.org.pkijs.asn1.CHARACTERSTRING;
    //**************************************************************************************
    in_window.org.pkijs.asn1.CHARACTERSTRING.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "CHARACTERSTRING";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.CHARACTERSTRING.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = local.SIMPLESTRING_block.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.CHARACTERSTRING.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Declaration of all date and time classes
    //**************************************************************************************
    in_window.org.pkijs.asn1.UTCTIME =
    function()
    {
        in_window.org.pkijs.asn1.VISIBLESTRING.call(this, arguments[0]);

        this.year = 0;
        this.month = 0;
        this.day = 0;
        this.hour = 0;
        this.minute = 0;
        this.second = 0;

        // #region Create UTCTIME from ASN.1 UTC string value
        if((arguments[0] instanceof Object) && ("value" in arguments[0]))
        {
            in_window.org.pkijs.asn1.UTCTIME.prototype.fromString.call(this, arguments[0].value);

            this.value_block.value_hex = new ArrayBuffer(arguments[0].value.length);
            var view = new Uint8Array(this.value_block.value_hex);

            for(var i = 0; i < str.length; i++)
                view[i] = arguments[0].value.charCodeAt(i);
        }
        // #endregion
        // #region Create UTCTIME from JavaScript Date type
        if((arguments[0] instanceof Object) && ("value_date" in arguments[0]))
        {
            in_window.org.pkijs.asn1.UTCTIME.prototype.fromDate.call(this, arguments[0].value_date);
            this.value_block.value_hex = in_window.org.pkijs.asn1.UTCTIME.prototype.toBuffer.call(this);
        }
        // #endregion

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 23; // UTCTIME
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.UTCTIME.prototype = new in_window.org.pkijs.asn1.VISIBLESTRING();
    in_window.org.pkijs.asn1.UTCTIME.constructor = in_window.org.pkijs.asn1.UTCTIME;
    //**************************************************************************************
    in_window.org.pkijs.asn1.UTCTIME.prototype.fromBER =
    function(input_buffer, input_offset, input_length)
    {
        /// <summary>Base function for converting block from BER encoded array of bytes</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array</param>
        /// <param name="input_offset" type="Number">Offset in ASN.1 BER encoded array where decoding should be started</param>
        /// <param name="input_length" type="Number">Maximum length of array of bytes which can be using in this function</param>

        var result_offset = this.value_block.fromBER(input_buffer, input_offset, (this.len_block.is_indefinite_form == true) ? input_length : this.len_block.length);
        if(result_offset == (-1))
        {
            this.error = this.value_block.error;
            return result_offset;
        }

        in_window.org.pkijs.asn1.UTCTIME.prototype.fromBuffer.call(this, this.value_block.value_hex);

        if(this.id_block.error.length == 0)
            this.block_length += this.id_block.block_length;

        if(this.len_block.error.length == 0)
            this.block_length += this.len_block.block_length;

        if(this.value_block.error.length == 0)
            this.block_length += this.value_block.block_length;

        return result_offset;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.UTCTIME.prototype.fromBuffer =
    function(input_buffer)
    {
        in_window.org.pkijs.asn1.UTCTIME.prototype.fromString.call(this, String.fromCharCode.apply(null, new Uint8Array(input_buffer)));
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.UTCTIME.prototype.toBuffer =
    function()
    {
        var str = in_window.org.pkijs.asn1.UTCTIME.prototype.toString.call(this);

        var buffer = new ArrayBuffer(str.length);
        var view = new Uint8Array(buffer);

        for(var i = 0; i < str.length; i++)
            view[i] = str.charCodeAt(i);

        return buffer;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.UTCTIME.prototype.fromDate =
    function(input_date)
    {
        /// <summary>Create "UTCTime" ASN.1 type from JavaScript "Date" type</summary>

        this.year = input_date.getFullYear();
        this.month = input_date.getMonth() + 1;
        this.day = input_date.getDate();
        this.hour = input_date.getHours();
        this.minute = input_date.getMinutes();
        this.second = input_date.getSeconds();
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.UTCTIME.prototype.toDate =
    function()
    {
        return (new Date(this.year, this.month - 1, this.day, this.hour, this.minute, this.second));
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.UTCTIME.prototype.fromString =
    function(input_string)
    {
        /// <summary>Create "UTCTime" ASN.1 type from JavaScript "String" type</summary>

        // #region Parse input string
        var parser = /(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z/ig;
        var parser_array = parser.exec(input_string);
        if(parser_array === null)
        {
            this.error = "Wrong input string for convertion";
            return;
        }
        // #endregion

        // #region Store parsed values
        var year = parseInt(parser_array[1], 10);
        if(year >= 50)
            this.year = 1900 + year;
        else
            this.year = 2000 + year;

        this.month = parseInt(parser_array[2], 10);
        this.day = parseInt(parser_array[3], 10);
        this.hour = parseInt(parser_array[4], 10);
        this.minute = parseInt(parser_array[5], 10);
        this.second = parseInt(parser_array[6], 10);
        // #endregion
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.UTCTIME.prototype.toString =
    function()
    {
        var output_array = new Array(7);

        output_array[0] = in_window.org.pkijs.padNumber(((this.year < 2000) ? (this.year - 1900) : (this.year - 2000)), 2);
        output_array[1] = in_window.org.pkijs.padNumber(this.month, 2);
        output_array[2] = in_window.org.pkijs.padNumber(this.day, 2);
        output_array[3] = in_window.org.pkijs.padNumber(this.hour, 2);
        output_array[4] = in_window.org.pkijs.padNumber(this.minute, 2);
        output_array[5] = in_window.org.pkijs.padNumber(this.second, 2);
        output_array[6] = "Z";

        return output_array.join('');
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.UTCTIME.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "UTCTIME";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.UTCTIME.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = in_window.org.pkijs.asn1.VISIBLESTRING.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.UTCTIME.prototype.block_name.call(this);
        _object.year = this.year;
        _object.month = this.month;
        _object.day = this.day;
        _object.hour = this.hour;
        _object.minute = this.minute;
        _object.second = this.second;

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.GENERALIZEDTIME =
    function()
    {
        in_window.org.pkijs.asn1.VISIBLESTRING.call(this, arguments[0]);

        this.year = 0;
        this.month = 0;
        this.day = 0;
        this.hour = 0;
        this.minute = 0;
        this.second = 0;

        // #region Create GeneralizedTime from ASN.1 string value
        if((arguments[0] instanceof Object) && ("value" in arguments[0]))
        {
            in_window.org.pkijs.asn1.GENERALIZEDTIME.prototype.fromString.call(this, arguments[0].value);

            this.value_block.value_hex = new ArrayBuffer(arguments[0].value.length);
            var view = new Uint8Array(this.value_block.value_hex);

            for(var i = 0; i < str.length; i++)
                view[i] = arguments[0].value.charCodeAt(i);
        }
        // #endregion
        // #region Create GeneralizedTime from JavaScript Date type
        if((arguments[0] instanceof Object) && ("value_date" in arguments[0]))
        {
            in_window.org.pkijs.asn1.GENERALIZEDTIME.prototype.fromDate.call(this, arguments[0].value_date);
            this.value_block.value_hex = in_window.org.pkijs.asn1.GENERALIZEDTIME.prototype.toBuffer.call(this);
        }
        // #endregion

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 24; // GENERALIZEDTIME
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.GENERALIZEDTIME.prototype = new in_window.org.pkijs.asn1.VISIBLESTRING();
    in_window.org.pkijs.asn1.GENERALIZEDTIME.constructor = in_window.org.pkijs.asn1.GENERALIZEDTIME;
    //**************************************************************************************
    in_window.org.pkijs.asn1.GENERALIZEDTIME.prototype.fromBER =
    function(input_buffer, input_offset, input_length)
    {
        /// <summary>Base function for converting block from BER encoded array of bytes</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array</param>
        /// <param name="input_offset" type="Number">Offset in ASN.1 BER encoded array where decoding should be started</param>
        /// <param name="input_length" type="Number">Maximum length of array of bytes which can be using in this function</param>

        var result_offset = this.value_block.fromBER(input_buffer, input_offset, (this.len_block.is_indefinite_form == true) ? input_length : this.len_block.length);
        if(result_offset == (-1))
        {
            this.error = this.value_block.error;
            return result_offset;
        }

        in_window.org.pkijs.asn1.GENERALIZEDTIME.prototype.fromBuffer.call(this, this.value_block.value_hex);

        if(this.id_block.error.length == 0)
            this.block_length += this.id_block.block_length;

        if(this.len_block.error.length == 0)
            this.block_length += this.len_block.block_length;

        if(this.value_block.error.length == 0)
            this.block_length += this.value_block.block_length;

        return result_offset;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.GENERALIZEDTIME.prototype.fromBuffer =
    function(input_buffer)
    {
        in_window.org.pkijs.asn1.GENERALIZEDTIME.prototype.fromString.call(this, String.fromCharCode.apply(null, new Uint8Array(input_buffer)));
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.GENERALIZEDTIME.prototype.toBuffer =
    function()
    {
        var str = in_window.org.pkijs.asn1.GENERALIZEDTIME.prototype.toString.call(this);

        var buffer = new ArrayBuffer(str.length);
        var view = new Uint8Array(buffer);

        for(var i = 0; i < str.length; i++)
            view[i] = str.charCodeAt(i);

        return buffer;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.GENERALIZEDTIME.prototype.fromDate =
    function(input_date)
    {
        /// <summary>Create "GeneralizedTime" ASN.1 type from JavaScript "Date" type</summary>

        this.year = input_date.getFullYear();
        this.month = input_date.getMonth() + 1;
        this.day = input_date.getDate();
        this.hour = input_date.getHours();
        this.minute = input_date.getMinutes();
        this.second = input_date.getSeconds();
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.GENERALIZEDTIME.prototype.toDate =
    function()
    {
        return (new Date(this.year, this.month - 1, this.day, this.hour, this.minute, this.second));
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.GENERALIZEDTIME.prototype.fromString =
    function(input_string)
    {
        /// <summary>Create "GeneralizedTime" ASN.1 type from JavaScript "String" type</summary>

        var parser = /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z/ig;
        var parser_array = parser.exec(input_string);
        if(parser_array === null)
        {
            this.error = "Wrong input string for convertion";
            return;
        }

        this.year = parseInt(parser_array[1], 10);
        this.month = parseInt(parser_array[2], 10);
        this.day = parseInt(parser_array[3], 10);
        this.hour = parseInt(parser_array[4], 10);
        this.minute = parseInt(parser_array[5], 10);
        this.second = parseInt(parser_array[6], 10);
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.GENERALIZEDTIME.prototype.toString =
    function()
    {
        var output_array = new Array(7);

        output_array[0] = in_window.org.pkijs.padNumber(this.year, 4);
        output_array[1] = in_window.org.pkijs.padNumber(this.month, 2);
        output_array[2] = in_window.org.pkijs.padNumber(this.day, 2);
        output_array[3] = in_window.org.pkijs.padNumber(this.hour, 2);
        output_array[4] = in_window.org.pkijs.padNumber(this.minute, 2);
        output_array[5] = in_window.org.pkijs.padNumber(this.second, 2);
        output_array[6] = "Z";

        return output_array.join('');
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.GENERALIZEDTIME.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "GENERALIZEDTIME";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.GENERALIZEDTIME.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = in_window.org.pkijs.asn1.VISIBLESTRING.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.GENERALIZEDTIME.prototype.block_name.call(this);
        _object.year = this.year;
        _object.month = this.month;
        _object.day = this.day;
        _object.hour = this.hour;
        _object.minute = this.minute;
        _object.second = this.second;

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.DATE =
    function()
    {
        in_window.org.pkijs.asn1.UTF8STRING.call(this, arguments[0]);

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 31; // DATE
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.DATE.prototype = new in_window.org.pkijs.asn1.UTF8STRING();
    in_window.org.pkijs.asn1.DATE.constructor = in_window.org.pkijs.asn1.DATE;
    //**************************************************************************************
    in_window.org.pkijs.asn1.DATE.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "DATE";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.DATE.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = in_window.org.pkijs.asn1.UTF8STRING.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.DATE.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.TIMEOFDAY =
    function()
    {
        in_window.org.pkijs.asn1.UTF8STRING.call(this, arguments[0]);
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.TIMEOFDAY.prototype = new in_window.org.pkijs.asn1.UTF8STRING();
    in_window.org.pkijs.asn1.TIMEOFDAY.constructor = in_window.org.pkijs.asn1.TIMEOFDAY;
    //**************************************************************************************
    in_window.org.pkijs.asn1.TIMEOFDAY.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "TIMEOFDAY";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.DATE.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = in_window.org.pkijs.asn1.UTF8STRING.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.TIMEOFDAY.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.DATETIME =
    function()
    {
        in_window.org.pkijs.asn1.UTF8STRING.call(this, arguments[0]);

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 33; // DATETIME
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.DATETIME.prototype = new in_window.org.pkijs.asn1.UTF8STRING();
    in_window.org.pkijs.asn1.DATETIME.constructor = in_window.org.pkijs.asn1.DATETIME;
    //**************************************************************************************
    in_window.org.pkijs.asn1.DATETIME.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "DATETIME";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.DATETIME.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = in_window.org.pkijs.asn1.UTF8STRING.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.DATETIME.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.DURATION =
    function()
    {
        in_window.org.pkijs.asn1.UTF8STRING.call(this, arguments[0]);
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.DURATION.prototype = new in_window.org.pkijs.asn1.UTF8STRING();
    in_window.org.pkijs.asn1.DURATION.constructor = in_window.org.pkijs.asn1.DURATION;
    //**************************************************************************************
    in_window.org.pkijs.asn1.DURATION.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "DURATION";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.DURATION.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = in_window.org.pkijs.asn1.UTF8STRING.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.DURATION.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.TIME =
    function()
    {
        in_window.org.pkijs.asn1.UTF8STRING.call(this, arguments[0]);

        this.id_block.tag_class = 1; // UNIVERSAL
        this.id_block.tag_number = 14; // TIME
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.TIME.prototype = new in_window.org.pkijs.asn1.UTF8STRING();
    in_window.org.pkijs.asn1.TIME.constructor = in_window.org.pkijs.asn1.TIME;
    //**************************************************************************************
    in_window.org.pkijs.asn1.TIME.prototype.block_name =
    function()
    {
        /// <summary>Aux function, need to get a block name. Need to have it here for inhiritence</summary>

        return "TIME";
    }
    //**************************************************************************************
    in_window.org.pkijs.asn1.TIME.prototype.toJSON =
    function()
    {
        /// <summary>Convertion for the block to JSON object</summary>

        var _object = in_window.org.pkijs.asn1.UTF8STRING.prototype.toJSON.call(this);

        _object.block_name = in_window.org.pkijs.asn1.TIME.prototype.block_name.call(this);

        return _object;
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Declaration of special ASN.1 schema type CHOICE
    //**************************************************************************************
    in_window.org.pkijs.asn1.CHOICE =
    function()
    {
        if(arguments[0] instanceof Object)
        {
            this.value = in_window.org.pkijs.getValue(arguments[0], "value", new Array()); // Array of ASN.1 types for make a choice from
            this.optional = in_window.org.pkijs.getValue(arguments[0], "optional", false);
        }
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Declaration of special ASN.1 schema type ANY
    //**************************************************************************************
    in_window.org.pkijs.asn1.ANY =
    function()
    {
        if(arguments[0] instanceof Object)
        {
            this.name = in_window.org.pkijs.getValue(arguments[0], "name", "");
            this.optional = in_window.org.pkijs.getValue(arguments[0], "optional", false);
        }
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Declaration of special ASN.1 schema type REPEATED
    //**************************************************************************************
    in_window.org.pkijs.asn1.REPEATED =
    function()
    {
        if(arguments[0] instanceof Object)
        {
            this.name = in_window.org.pkijs.getValue(arguments[0], "name", "");
            this.optional = in_window.org.pkijs.getValue(arguments[0], "optional", false);
            this.value = in_window.org.pkijs.getValue(arguments[0], "value", new in_window.org.pkijs.asn1.ANY());
            this.local = in_window.org.pkijs.getValue(arguments[0], "local", false); // Could local or global array to store elements
        }
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Major ASN.1 BER decoding function
    //**************************************************************************************
    function fromBER_raw(input_buffer, input_offset, input_length)
    {
        var incoming_offset = input_offset; // Need to store initial offset since "input_offset" is changing in the function

        // #region Local function changing a type for ASN.1 classes
        function local_change_type(input_object, new_type)
        {
            if(input_object instanceof new_type)
                return input_object;

            var new_object = new new_type();
            new_object.id_block = input_object.id_block;
            new_object.len_block = input_object.len_block;
            new_object.warnings = input_object.warnings;
            new_object.value_before_decode = util_copybuf(input_object.value_before_decode);

            return new_object;
        }
        // #endregion

        // #region Create a basic ASN.1 type since we need to return errors and warnings from the function
        var return_object = new in_window.org.pkijs.asn1.ASN1_block();
        // #endregion

        // #region Basic check for parameters
        if(check_buffer_params(input_buffer, input_offset, input_length) === false)
        {
            return_object.error = "Wrong input parameters";
            return {
                offset: (-1),
                result: return_object
            };
        }
        // #endregion

        // #region Getting Uint8Array from ArrayBuffer
        var int_buffer = new Uint8Array(input_buffer, input_offset, input_length);
        // #endregion

        // #region Initial checks
        if(int_buffer.length == 0)
        {
            this.error = "Zero buffer length";
            return {
                offset: (-1),
                result: return_object
            };
        }
        // #endregion

        // #region Decode indentifcation block of ASN.1 BER structure
        var result_offset = return_object.id_block.fromBER(input_buffer, input_offset, input_length);
        return_object.warnings.concat(return_object.id_block.warnings);
        if(result_offset == (-1))
        {
            return_object.error = return_object.id_block.error;
            return {
                offset: (-1),
                result: return_object
            };
        }

        input_offset = result_offset;
        input_length -= return_object.id_block.block_length;
        // #endregion

        // #region Decode length block of ASN.1 BER structure
        result_offset = return_object.len_block.fromBER(input_buffer, input_offset, input_length);
        return_object.warnings.concat(return_object.len_block.warnings);
        if(result_offset == (-1))
        {
            return_object.error = return_object.len_block.error;
            return {
                offset: (-1),
                result: return_object
            };
        }

        input_offset = result_offset;
        input_length -= return_object.len_block.block_length;
        // #endregion

        // #region Check for usign indefinite length form in encoding for primitive types
        if((return_object.id_block.is_constructed == false) &&
           (return_object.len_block.is_indefinite_form == true))
        {
            return_object.error = new String("Indefinite length form used for primitive encoding form");
            return {
                offset: (-1),
                result: return_object
            };
        }
        // #endregion

        // #region Switch ASN.1 block type
        var new_asn1_type = in_window.org.pkijs.asn1.ASN1_block;

        switch(return_object.id_block.tag_class)
        {
            // #region UNIVERSAL
            case 1:
                // #region Check for reserved tag numbers
                if((return_object.id_block.tag_number >= 37) &&
                   (return_object.id_block.is_hex_only == false))
                {
                    return_object.error = "UNIVERSAL 37 and upper tags are reserved by ASN.1 standard";
                    return {
                        offset: (-1),
                        result: return_object
                    };
                }
                // #endregion

                switch(return_object.id_block.tag_number)
                {
                    // #region EOC type
                    case 0:
                        // #region Check for EOC type
                        if((return_object.id_block.is_constructed == true) &&
                           (return_object.len_block.length > 0))
                        {
                            return_object.error = "Type [UNIVERSAL 0] is reserved";
                            return {
                                offset: (-1),
                                result: return_object
                            };
                        }
                        // #endregion

                        new_asn1_type = in_window.org.pkijs.asn1.EOC;

                        break;
                        // #endregion
                    // #region BOOLEAN type
                    case 1:
                        new_asn1_type = in_window.org.pkijs.asn1.BOOLEAN;
                        break;
                    // #endregion
                    // #region INTEGER type
                    case 2:
                        new_asn1_type = in_window.org.pkijs.asn1.INTEGER;
                        break;
                    // #endregion
                    // #region BITSTRING type
                    case 3:
                        new_asn1_type = in_window.org.pkijs.asn1.BITSTRING;
                        break;
                    // #endregion
                    // #region OCTETSTRING type
                    case 4:
                        new_asn1_type = in_window.org.pkijs.asn1.OCTETSTRING;
                        break;
                    // #endregion
                    // #region NULL type
                    case 5:
                        new_asn1_type = in_window.org.pkijs.asn1.NULL;
                        break;
                    // #endregion
                    // #region OBJECT IDENTIFIER type
                    case 6:
                        new_asn1_type = in_window.org.pkijs.asn1.OID;
                        break;
                    // #endregion
                    // #region ENUMERATED type
                    case 10:
                        new_asn1_type = in_window.org.pkijs.asn1.ENUMERATED;
                        break;
                    // #endregion
                    // #region UTF8STRING type
                    case 12:
                        new_asn1_type = in_window.org.pkijs.asn1.UTF8STRING;
                        break;
                    // #endregion
                    // #region TIME type
                    case 14:
                        new_asn1_type = in_window.org.pkijs.asn1.TIME;
                        break;
                    // #endregion
                    // #region ASN.1 reserved type
                    case 15:
                        return_object.error = "[UNIVERSAL 15] is reserved by ASN.1 standard";
                        return {
                            offset: (-1),
                            result: return_object
                        };
                        break;
                    // #endregion
                    // #region SEQUENCE type
                    case 16:
                        new_asn1_type = in_window.org.pkijs.asn1.SEQUENCE;
                        break;
                    // #endregion
                    // #region SET type
                    case 17:
                        new_asn1_type = in_window.org.pkijs.asn1.SET;
                        break;
                    // #endregion
                    // #region NUMERICSTRING type
                    case 18:
                        new_asn1_type = in_window.org.pkijs.asn1.NUMERICSTRING;
                        break;
                    // #endregion
                    // #region PRINTABLESTRING type
                    case 19:
                        new_asn1_type = in_window.org.pkijs.asn1.PRINTABLESTRING;
                        break;
                    // #endregion
                    // #region TELETEXSTRING type
                    case 20:
                        new_asn1_type = in_window.org.pkijs.asn1.TELETEXSTRING;
                        break;
                    // #endregion
                    // #region VIDEOTEXSTRING type
                    case 21:
                        new_asn1_type = in_window.org.pkijs.asn1.VIDEOTEXSTRING;
                        break;
                    // #endregion
                    // #region IA5STRING type
                    case 22:
                        new_asn1_type = in_window.org.pkijs.asn1.IA5STRING;
                        break;
                    // #endregion
                    // #region UTCTIME type
                    case 23:
                        new_asn1_type = in_window.org.pkijs.asn1.UTCTIME;
                        break;
                    // #endregion
                    // #region GENERALIZEDTIME type
                    case 24:
                        new_asn1_type = in_window.org.pkijs.asn1.GENERALIZEDTIME;
                        break;
                    // #endregion
                    // #region GRAPHICSTRING type
                    case 25:
                        new_asn1_type = in_window.org.pkijs.asn1.GRAPHICSTRING;
                        break;
                    // #endregion
                    // #region VISIBLESTRING type
                    case 26:
                        new_asn1_type = in_window.org.pkijs.asn1.VISIBLESTRING;
                        break;
                    // #endregion
                    // #region GENERALSTRING type
                    case 27:
                        new_asn1_type = in_window.org.pkijs.asn1.GENERALSTRING;
                        break;
                    // #endregion
                    // #region UNIVERSALSTRING type
                    case 28:
                        new_asn1_type = in_window.org.pkijs.asn1.UNIVERSALSTRING;
                        break;
                    // #endregion
                    // #region CHARACTERSTRING type
                    case 29:
                        new_asn1_type = in_window.org.pkijs.asn1.CHARACTERSTRING;
                        break;
                    // #endregion
                    // #region BMPSTRING type
                    case 30:
                        new_asn1_type = in_window.org.pkijs.asn1.BMPSTRING;
                        break;
                    // #endregion
                    // #region DATE type
                    case 31:
                        new_asn1_type = in_window.org.pkijs.asn1.DATE;
                        break;
                    // #endregion
                    // #region DATE-TIME type
                    case 33:
                        new_asn1_type = in_window.org.pkijs.asn1.DATETIME;
                        break;
                    // #endregion
                    // #region default
                    default:
                        {
                            var new_object;

                            if(return_object.id_block.is_constructed == true)
                                new_object = new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED();
                            else
                                new_object = new in_window.org.pkijs.asn1.ASN1_PRIMITIVE();

                            new_object.id_block = return_object.id_block;
                            new_object.len_block = return_object.len_block;
                            new_object.warnings = return_object.warnings;

                            return_object = new_object;

                            result_offset = return_object.fromBER(input_buffer, input_offset, input_length);
                        }
                    // #endregion
                }
                break;
            // #endregion
            // #region All other tag classes
            case 2: // APPLICATION
            case 3: // CONTEXT-SPECIFIC
            case 4: // PRIVATE
            default:
                {
                    if(return_object.id_block.is_constructed == true)
                        new_asn1_type = in_window.org.pkijs.asn1.ASN1_CONSTRUCTED;
                    else
                        new_asn1_type = in_window.org.pkijs.asn1.ASN1_PRIMITIVE;
                }
            // #endregion
        }
        // #endregion

        // #region Change type and perform BER decoding
        return_object = local_change_type(return_object, new_asn1_type);
        result_offset = return_object.fromBER(input_buffer, input_offset, (return_object.len_block.is_indefinite_form == true) ? input_length : return_object.len_block.length);
        // #endregion

        // #region Coping incoming buffer for entire ASN.1 block
        return_object.value_before_decode = util_copybuf_offset(input_buffer, incoming_offset, return_object.block_length);
        // #endregion

        return {
            offset: result_offset,
            result: return_object
        };
    }
    //**************************************************************************************
    in_window.org.pkijs.fromBER =
    function(input_buffer)
    {
        /// <summary>Major function for decoding ASN.1 BER array into internal library structuries</summary>
        /// <param name="input_buffer" type="ArrayBuffer">ASN.1 BER encoded array of bytes</param>

        if(input_buffer.byteLength == 0)
        {
            var result = new in_window.org.pkijs.asn1.ASN1_block();
            result.error = "Input buffer has zero length";

            return result;
        }

        return fromBER_raw(input_buffer, 0, input_buffer.byteLength);
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Major scheme verification function
    //**************************************************************************************
    in_window.org.pkijs.compareSchema =
    function(root, input_asn1_data, input_asn1_schema)
    {
        // #region Special case for CHOICE schema element type
        if(input_asn1_schema instanceof in_window.org.pkijs.asn1.CHOICE)
        {
            var choice_result = false;

            for(var j = 0; j < input_asn1_schema.value.length; j++)
            {
                var result = in_window.org.pkijs.compareSchema(root, input_asn1_data, input_asn1_schema.value[j]);
                if(result.verified === true)
                    return {
                        verified: true,
                        result: root
                    };
            }

            if(choice_result === false)
            {
                var _result = {
                    verified: false,
                    result: {
                        error: "Wrong values for CHOICE type"
                    }
                };

                if(input_asn1_schema.hasOwnProperty('name'))
                    _result.name = input_asn1_schema.name;

                return _result;
            }
        }
        // #endregion

        // #region Special case for ANY schema element type
        if(input_asn1_schema instanceof in_window.org.pkijs.asn1.ANY)
        {
            // #region Add named component of ASN.1 schema
            if(input_asn1_schema.hasOwnProperty('name'))
                root[input_asn1_schema.name] = input_asn1_data;
            // #endregion

            return {
                verified: true,
                result: root
            };
        }
        // #endregion

        // #region Initial check
        if((root instanceof Object) === false)
            return {
                verified: false,
                result: { error: "Wrong root object" }
            };

        if((input_asn1_data instanceof Object) === false)
            return {
                verified: false,
                result: { error: "Wrong ASN.1 data" }
            };

        if((input_asn1_schema instanceof Object) === false)
            return {
                verified: false,
                result: { error: "Wrong ASN.1 schema" }
            };

        if(('id_block' in input_asn1_schema) === false)
            return {
                verified: false,
                result: { error: "Wrong ASN.1 schema" }
            };
        // #endregion

        // #region Comparing id_block properties in ASN.1 data and ASN.1 schema
        // #region Encode and decode ASN.1 schema id_block
        /// <remarks>This encoding/decoding is neccessary because could be an errors in schema definition</remarks>
        if(('fromBER' in input_asn1_schema.id_block) === false)
            return {
                verified: false,
                result: { error: "Wrong ASN.1 schema" }
            };

        if(('toBER' in input_asn1_schema.id_block) === false)
            return {
                verified: false,
                result: { error: "Wrong ASN.1 schema" }
            };

        var encoded_id = input_asn1_schema.id_block.toBER(false);
        if(encoded_id.byteLength === 0)
            return {
                verified: false,
                result: { error: "Error encoding id_block for ASN.1 schema" }
            };

        var decoded_offset = input_asn1_schema.id_block.fromBER(encoded_id, 0, encoded_id.byteLength);
        if(decoded_offset === (-1))
            return {
                verified: false,
                result: { error: "Error decoding id_block for ASN.1 schema" }
            };
        // #endregion

        // #region tag_class
        if(input_asn1_schema.id_block.hasOwnProperty('tag_class') === false)
            return {
                verified: false,
                result: { error: "Wrong ASN.1 schema" }
            };

        if(input_asn1_schema.id_block.tag_class !== input_asn1_data.id_block.tag_class)
            return {
                verified: false,
                result: root
            };
        // #endregion
        // #region tag_number
        if(input_asn1_schema.id_block.hasOwnProperty('tag_number') === false)
            return {
                verified: false,
                result: { error: "Wrong ASN.1 schema" }
            };

        if(input_asn1_schema.id_block.tag_number !== input_asn1_data.id_block.tag_number)
            return {
                verified: false,
                result: root
            };
        // #endregion
        // #region is_constructed
        if(input_asn1_schema.id_block.hasOwnProperty('is_constructed') === false)
            return {
                verified: false,
                result: { error: "Wrong ASN.1 schema" }
            };

        if(input_asn1_schema.id_block.is_constructed !== input_asn1_data.id_block.is_constructed)
            return {
                verified: false,
                result: root
            };
        // #endregion
        // #region is_hex_only
        if(('is_hex_only' in input_asn1_schema.id_block) === false) // Since 'is_hex_only' is an inhirited property
            return {
                verified: false,
                result: { error: "Wrong ASN.1 schema" }
            };

        if(input_asn1_schema.id_block.is_hex_only !== input_asn1_data.id_block.is_hex_only)
            return {
                verified: false,
                result: root
            };
        // #endregion
        // #region value_hex
        if(input_asn1_schema.id_block.is_hex_only === true)
        {
            if(('value_hex' in input_asn1_schema.id_block) === false) // Since 'value_hex' is an inhirited property
                return {
                    verified: false,
                    result: { error: "Wrong ASN.1 schema" }
                };

            var schema_view = new Uint8Array(input_asn1_schema.id_block.value_hex);
            var asn1_view = new Uint8Array(input_asn1_data.id_block.value_hex);

            if(schema_view.length !== asn1_view.length)
                return {
                    verified: false,
                    result: root
                };

            for(var i = 0; i < schema_view.length; i++)
            {
                if(schema_view[i] !== asn1_view[1])
                    return {
                        verified: false,
                        result: root
                    };
            }
        }
        // #endregion
        // #endregion

        // #region Add named component of ASN.1 schema
        if(input_asn1_schema.hasOwnProperty('name'))
        {
            input_asn1_schema.name = input_asn1_schema.name.replace(/^\s+|\s+$/g, '');
            if(input_asn1_schema.name !== "")
                root[input_asn1_schema.name] = input_asn1_data;
        }
        // #endregion

        // #region Getting next ASN.1 block for comparition
        if(input_asn1_schema.id_block.is_constructed === true)
        {
            var admission = 0;
            var result = { verified: false };

            var max_length = input_asn1_schema.value_block.value.length;

            if(max_length > 0)
            {
                if(input_asn1_schema.value_block.value[0] instanceof in_window.org.pkijs.asn1.REPEATED)
                    max_length = input_asn1_data.value_block.value.length;
            }

            // #region Special case when constructive value has no elements
            if(max_length === 0)
                return {
                    verified: true,
                    result: root
                };
            // #endregion

            // #region Special case when "input_asn1_data" has no values and "input_asn1_schema" has all optional values
            if((input_asn1_data.value_block.value.length === 0) &&
               (input_asn1_schema.value_block.value.length !== 0))
            {
                var _optional = true;

                for(var i = 0; i < input_asn1_schema.value_block.value.length; i++)
                    _optional = _optional && (input_asn1_schema.value_block.value[i].optional || false);

                if(_optional === true)
                {
                    return {
                        verified: true,
                        result: root
                    };
                }
                else
                {
                    // #region Delete early added name of block
                    if(input_asn1_schema.hasOwnProperty('name'))
                    {
                        input_asn1_schema.name = input_asn1_schema.name.replace(/^\s+|\s+$/g, '');
                        if(input_asn1_schema.name !== "")
                            delete root[input_asn1_schema.name];
                    }
                    // #endregion

                    root.error = "Inconsistent object length";

                    return {
                        verified: false,
                        result: root
                    };
                }
            }
            // #endregion

            for(var i = 0; i < max_length; i++)
            {
                // #region Special case when there is an "optional" element of ASN.1 schema at the end
                if((i - admission) >= input_asn1_data.value_block.value.length)
                {
                    if(input_asn1_schema.value_block.value[i].optional === false)
                    {
                        var _result = {
                            verified: false,
                            result: root
                        };

                        root.error = "Inconsistent length between ASN.1 data and schema";

                        // #region Delete early added name of block
                        if(input_asn1_schema.hasOwnProperty('name'))
                        {
                            input_asn1_schema.name = input_asn1_schema.name.replace(/^\s+|\s+$/g, '');
                            if(input_asn1_schema.name !== "")
                            {
                                delete root[input_asn1_schema.name];
                                _result.name = input_asn1_schema.name;
                            }
                        }
                        // #endregion

                        return _result;
                    }
                }
                    // #endregion
                else
                {
                    // #region Special case for REPEATED type of ASN.1 schema element
                    if(input_asn1_schema.value_block.value[0] instanceof in_window.org.pkijs.asn1.REPEATED)
                    {
                        result = in_window.org.pkijs.compareSchema(root, input_asn1_data.value_block.value[i], input_asn1_schema.value_block.value[0].value);
                        if(result.verified === false)
                        {
                            if(input_asn1_schema.value_block.value[0].optional === true)
                                admission++;
                            else
                            {
                                // #region Delete early added name of block
                                if(input_asn1_schema.hasOwnProperty('name'))
                                {
                                    input_asn1_schema.name = input_asn1_schema.name.replace(/^\s+|\s+$/g, '');
                                    if(input_asn1_schema.name !== "")
                                        delete root[input_asn1_schema.name];
                                }
                                // #endregion

                                return result;
                            }
                        }

                        if(("name" in input_asn1_schema.value_block.value[0]) && (input_asn1_schema.value_block.value[0].name.length > 0))
                        {
                            var array_root = {};

                            if(("local" in input_asn1_schema.value_block.value[0]) && (input_asn1_schema.value_block.value[0].local === true))
                                array_root = input_asn1_data;
                            else
                                array_root = root;

                            if(typeof array_root[input_asn1_schema.value_block.value[0].name] === "undefined")
                                array_root[input_asn1_schema.value_block.value[0].name] = new Array();

                            array_root[input_asn1_schema.value_block.value[0].name].push(input_asn1_data.value_block.value[i]);
                        }
                    }
                        // #endregion
                    else
                    {
                        result = in_window.org.pkijs.compareSchema(root, input_asn1_data.value_block.value[i - admission], input_asn1_schema.value_block.value[i]);
                        if(result.verified === false)
                        {
                            if(input_asn1_schema.value_block.value[i].optional === true)
                                admission++;
                            else
                            {
                                // #region Delete early added name of block
                                if(input_asn1_schema.hasOwnProperty('name'))
                                {
                                    input_asn1_schema.name = input_asn1_schema.name.replace(/^\s+|\s+$/g, '');
                                    if(input_asn1_schema.name !== "")
                                        delete root[input_asn1_schema.name];
                                }
                                // #endregion

                                return result;
                            }
                        }
                    }
                }
            }

            if(result.verified === false) // The situation may take place if last element is "optional" and verification failed
            {
                var _result = {
                    verified: false,
                    result: root
                };

                // #region Delete early added name of block
                if(input_asn1_schema.hasOwnProperty('name'))
                {
                    input_asn1_schema.name = input_asn1_schema.name.replace(/^\s+|\s+$/g, '');
                    if(input_asn1_schema.name !== "")
                    {
                        delete root[input_asn1_schema.name];
                        _result.name = input_asn1_schema.name;
                    }
                }
                // #endregion

                return _result;
            }

            return {
                verified: true,
                result: root
            };
        }
        // #endregion
        // #region Ability to parse internal value for primitive-encoded value (value of OCTETSTRING, for example)
        else
        {
            if( ("primitive_schema" in input_asn1_schema) &&
                ("value_hex" in input_asn1_data.value_block) )
            {
                // #region Decoding of raw ASN.1 data
                var asn1 = in_window.org.pkijs.fromBER(input_asn1_data.value_block.value_hex);
                if(asn1.offset === (-1))
                {
                    var _result = {
                        verified: false,
                        result: asn1.result
                    };

                    // #region Delete early added name of block
                    if(input_asn1_schema.hasOwnProperty('name'))
                    {
                        input_asn1_schema.name = input_asn1_schema.name.replace(/^\s+|\s+$/g, '');
                        if(input_asn1_schema.name !== "")
                        {
                            delete root[input_asn1_schema.name];
                            _result.name = input_asn1_schema.name;
                        }
                    }
                    // #endregion

                    return _result;
                }
                // #endregion

                return in_window.org.pkijs.compareSchema(root, asn1.result, input_asn1_schema.primitive_schema);
            }
            else
                return {
                    verified: true,
                    result: root
                };
        }
        // #endregion
    }
    //**************************************************************************************
    in_window.org.pkijs.verifySchema =
    function(input_buffer, input_schema)
    {
        // #region Initial check
        if((input_schema instanceof Object) === false)
            return {
                varified: false,
                result: { error: "Wrong ASN.1 schema type" }
            };
        // #endregion

        // #region Decoding of raw ASN.1 data
        var asn1 = in_window.org.pkijs.fromBER(input_buffer);
        if(asn1.offset === (-1))
            return {
                verified: false,
                result: asn1.result
            };
        // #endregion

        // #region Compare ASN.1 struct with input schema
        return in_window.org.pkijs.compareSchema(asn1.result, asn1.result, input_schema);
        // #endregion
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Major function converting JSON to ASN.1 objects
    //**************************************************************************************
    in_window.org.pkijs.fromJSON =
    function(json)
    {
        /// <summary>Converting from JSON to ASN.1 objects</summary>
        /// <param name="json" type="String|Object">JSON string or object to convert to ASN.1 objects</param>
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
}
)(typeof exports !== "undefined" ? exports : window);

//third_party/javascript/asn1js/common.js
/*
 * @license
 * Copyright (c) 2014, GMO GlobalSign
 * Copyright (c) 2015, Peculiar Ventures
 * All rights reserved.
 *
 * Author 2014-2015, Yury Strozhevsky <www.strozhevsky.com>.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 * IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 * NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY
 * OF SUCH DAMAGE.
 *
 */
(
function(in_window)
{
    //**************************************************************************************
    // #region Declaration of global variables
    //**************************************************************************************
    // #region "org" namespace
    if(typeof in_window.org === "undefined")
        in_window.org = {};
    else
    {
        if(typeof in_window.org !== "object")
            throw new Error("Name org already exists and it's not an object");
    }
    // #endregion

    // #region "org.pkijs" namespace
    if(typeof in_window.org.pkijs === "undefined")
        in_window.org.pkijs = {};
    else
    {
        if(typeof in_window.org.pkijs !== "object")
            throw new Error("Name org.pkijs already exists and it's not an object" + " but " + (typeof in_window.org.pkijs));
    }
    // #endregion

    // #region "local" namespace
    var local = {};
    // #endregion
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
    // #region Declaration of common functions
    //**************************************************************************************
    in_window.org.pkijs.emptyObject =
    function()
    {
        this.toJSON = function()
        {
            return {};
        };
        this.toSchema = function()
        {
            return {};
        };
    }
    //**************************************************************************************
    in_window.org.pkijs.getNames =
    function(arg)
    {
        /// <summary>Get correct "names" array for all "schema" objects</summary>

        var names = {};

        if(arg instanceof Object)
            names = (arg.names || {});

        return names;
    }
    //**************************************************************************************
    in_window.org.pkijs.inheriteObjectFields =
    function(from)
    {
        for(i in from.prototype)
        {
            if(typeof from.prototype[i] === "function")
                continue;

            this[i] = from.prototype[i];
        }
    }
    //**************************************************************************************
    in_window.org.pkijs.getUTCDate =
    function(date)
    {
        /// <summary>Making UTC date from local date</summary>
        /// <param name="date" type="Date">Date to convert from</param>

        var current_date = date;
        return new Date(current_date.getTime() + (current_date.getTimezoneOffset() * 60000));
    }
    //**************************************************************************************
    in_window.org.pkijs.padNumber =
    function(input_number, full_length)
    {
        var str = input_number.toString(10);
        var dif = full_length - str.length;

        var padding = new Array(dif);
        for(var i = 0; i < dif; i++)
            padding[i] = '0';

        var padding_string = padding.join('');

        return padding_string.concat(str);
    }
    //**************************************************************************************
    in_window.org.pkijs.getValue =
    function(args, item, default_value)
    {
        if(item in args)
            return args[item];
        else
            return default_value;
    }
    //**************************************************************************************
    in_window.org.pkijs.isEqual_view =
    function(input_view1, input_view2)
    {
        /// <summary>Compare two Uint8Arrays</summary>
        /// <param name="input_view1" type="Uint8Array">First Uint8Array for comparision</param>
        /// <param name="input_view2" type="Uint8Array">Second Uint8Array for comparision</param>

        if(input_view1.length !== input_view2.length)
            return false;

        for(var i = 0; i < input_view1.length; i++)
        {
            if(input_view1[i] != input_view2[i])
                return false;
        }

        return true;
    }
    //**************************************************************************************
    in_window.org.pkijs.isEqual_buffer =
    function(input_buffer1, input_buffer2)
    {
        /// <summary>Compare two array buffers</summary>
        /// <param name="input_buffer1" type="ArrayBuffer">First ArrayBuffer for comparision</param>
        /// <param name="input_buffer2" type="ArrayBuffer">Second ArrayBuffer for comparision</param>

        if(input_buffer1.byteLength != input_buffer2.byteLength)
            return false;

        var view1 = new Uint8Array(input_buffer1);
        var view2 = new Uint8Array(input_buffer2);

        return in_window.org.pkijs.isEqual_view(view1, view2);
    }
    //**************************************************************************************
    in_window.org.pkijs.concat_buffers =
    function(input_buf1, input_buf2)
    {
        /// <summary>Concatenate two ArrayBuffers</summary>
        /// <param name="input_buf1" type="ArrayBuffer">First ArrayBuffer (first part of concatenated array)</param>
        /// <param name="input_buf2" type="ArrayBuffer">Second ArrayBuffer (second part of concatenated array)</param>

        var input_view1 = new Uint8Array(input_buf1);
        var input_view2 = new Uint8Array(input_buf2);

        var ret_buf = new ArrayBuffer(input_buf1.byteLength + input_buf2.byteLength);
        var ret_view = new Uint8Array(ret_buf);

        for(var i = 0; i < input_buf1.byteLength; i++)
            ret_view[i] = input_view1[i];

        for(var j = 0; j < input_buf2.byteLength; j++)
            ret_view[input_buf1.byteLength + j] = input_view2[j];

        return ret_buf;
    }
    //**************************************************************************************
    in_window.org.pkijs.copyBuffer =
    function(input_buffer)
    {
        var result = new ArrayBuffer(input_buffer.byteLength);

        var resultView = new Uint8Array(result);
        var inputView = new Uint8Array(input_buffer);

        for(var i = 0; i < inputView.length; i++)
            resultView[i] = inputView[i];

        return result;
    }
    //**************************************************************************************
    in_window.org.pkijs.getCrypto =
    function()
    {
        var crypto_temp;

        if("crypto" in in_window)
        {
            // Apple Safari support
            if("webkitSubtle" in in_window.crypto)
                crypto_temp = in_window.crypto.webkitSubtle;

            if("subtle" in in_window.crypto)
                crypto_temp = in_window.crypto.subtle;
        }

        return crypto_temp;
    }
    //**************************************************************************************
    in_window.org.pkijs.stringPrep =
    function(input_string)
    {
        /// <summary>String preparation function. In a future here will be realization of algorithm from RFC4518.</summary>
        /// <param name="input_string" type="String">JavaScript string. As soon as for each ASN.1 string type we have a specific transformation function here we will work with pure JavaScript string</param>
        /// <returns type="String">Formated string</returns>

        var result = input_string.replace(/^\s+|\s+$/g, ""); // Trim input string
        result = result.replace(/\s+/g, " "); // Change all sequence of SPACE down to SPACE char
        result = result.toLowerCase();

        return result;
    }
    //**************************************************************************************
    in_window.org.pkijs.bufferToHexCodes =
    function(input_buffer, input_offset, input_lenght)
    {
        var result = "";

        var int_buffer = new Uint8Array(input_buffer, input_offset, input_lenght);

        for(var i = 0; i < int_buffer.length; i++)
        {
            var str = int_buffer[i].toString(16).toUpperCase();
            result = result + ((str.length === 1) ? "0" : "") + str;
        }

        return result;
    }
    //**************************************************************************************
    in_window.org.pkijs.bufferFromHexCodes =
    function(hexString)
    {
        /// <summary>Create an ArrayBuffer from string having hexdecimal codes</summary>
        /// <param name="hexString" type="String">String to create ArrayBuffer from</param>

        // #region Initial variables
        var stringLength = hexString.length;

        var resultBuffer = new ArrayBuffer(stringLength >> 1);
        var resultView = new Uint8Array(resultBuffer);

        var hex_map = {};

        hex_map['0'] = 0x00;
        hex_map['1'] = 0x01;
        hex_map['2'] = 0x02;
        hex_map['3'] = 0x03;
        hex_map['4'] = 0x04;
        hex_map['5'] = 0x05;
        hex_map['6'] = 0x06;
        hex_map['7'] = 0x07;
        hex_map['8'] = 0x08;
        hex_map['9'] = 0x09;
        hex_map['A'] = 0x0A;
        hex_map['a'] = 0x0A;
        hex_map['B'] = 0x0B;
        hex_map['b'] = 0x0B;
        hex_map['C'] = 0x0C;
        hex_map['c'] = 0x0C;
        hex_map['D'] = 0x0D;
        hex_map['d'] = 0x0D;
        hex_map['E'] = 0x0E;
        hex_map['e'] = 0x0E;
        hex_map['F'] = 0x0F;
        hex_map['f'] = 0x0F;

        var j = 0;
        var temp = 0x00;
        // #endregion

        // #region Convert char-by-char
        for(var i = 0; i < stringLength; i++)
        {
            if(!(i % 2))
                temp = hex_map[hexString.charAt(i)] << 4;
            else
            {
                temp |= hex_map[hexString.charAt(i)];

                resultView[j] = temp;
                j++;
            }
        }
        // #endregion

        return resultBuffer;
    }
    //**************************************************************************************
    in_window.org.pkijs.getRandomValues =
    function(view)
    {
        /// <param name="view" type="Uint8Array">New array which gives a length for random value</param>

        if("crypto" in in_window)
            return in_window.crypto.getRandomValues(view);
        else
            throw new Error("No support for Web Cryptography API");
    }
    //**************************************************************************************
    in_window.org.pkijs.getAlgorithmParameters =
    function(algorithmName, operation)
    {
        /// <param name="algorithmName" type="String">Algorithm name to get common parameters for</param>
        /// <param name="operation" type="String">Kind of operation: "sign", "encrypt", "generatekey", "importkey", "exportkey", "verify"</param>

        var result = {
            algorithm: {},
            usages: []
        };

        switch(algorithmName.toUpperCase())
        {
            case "RSASSA-PKCS1-V1_5":
                switch(operation.toLowerCase())
                {
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "RSASSA-PKCS1-v1_5",
                                modulusLength: 2048,
                                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                                hash: {
                                    name: "SHA-256"
                                },
                            },
                            usages: ["sign", "verify"]
                        };
                        break;
                    case "verify":
                    case "sign":
                    case "importkey":
                        result = {
                            algorithm: {
                                name: "RSASSA-PKCS1-v1_5",
                                hash: {
                                    name: "SHA-256"
                                },
                            },
                            usages: ["verify"] // For importKey("pkcs8") usage must be "sign" only
                        };
                        break;
                    case "exportkey":
                    default:
                        return {
                            algorithm: {
                                name: "RSASSA-PKCS1-v1_5"
                            },
                            usages: []
                        };
                }
                break;
            case "RSA-PSS":
                switch(operation.toLowerCase())
                {
                    case "sign":
                    case "verify":
                        result = {
                            algorithm: {
                                name: "RSA-PSS",
                                hash: {
                                    name: "SHA-1"
                                },
                                saltLength: 20
                            },
                            usages: ["sign", "verify"]
                        };
                        break;
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "RSA-PSS",
                                modulusLength: 2048,
                                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                                hash: {
                                    name: "SHA-1"
                                }
                            },
                            usages: ["sign", "verify"]
                        };
                        break;
                    case "importkey":
                        result = {
                            algorithm: {
                                name: "RSA-PSS",
                                hash: {
                                    name: "SHA-1"
                                },
                            },
                            usages: ["verify"] // For importKey("pkcs8") usage must be "sign" only
                        };
                        break;
                    case "exportkey":
                    default:
                        return {
                            algorithm: {
                                name: "RSA-PSS"
                            },
                            usages: []
                        };
                }
                break;
            case "RSA-OAEP":
                switch(operation.toLowerCase())
                {
                    case "encrypt":
                    case "decrypt":
                        result = {
                            algorithm: {
                                name: "RSA-OAEP",
                            },
                            usages: ["encrypt", "decrypt"]
                        };
                        break;
                        break;
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "RSA-OAEP",
                                modulusLength: 2048,
                                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                                hash: {
                                    name: "SHA-256"
                                }
                            },
                            usages: ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
                        };
                        break;
                    case "importkey":
                        result = {
                            algorithm: {
                                name: "RSA-OAEP",
                                hash: {
                                    name: "SHA-256"
                                }
                            },
                            usages: ["encrypt"] // encrypt for "spki" and decrypt for "pkcs8"
                        };
                        break;
                    case "exportkey":
                    default:
                        return {
                            algorithm: {
                                name: "RSA-OAEP"
                            },
                            usages: []
                        };
                }
                break;
            case "ECDSA":
                switch(operation.toLowerCase())
                {
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "ECDSA",
                                namedCurve: "P-256"
                            },
                            usages: ["sign", "verify"]
                        };
                        break;
                    case "importkey":
                        result = {
                            algorithm: {
                                name: "ECDSA",
                                namedCurve: "P-256"
                            },
                            usages: ["verify"] // "sign" for "pkcs8"
                        };
                        break;
                    case "verify":
                    case "sign":
                        result = {
                            algorithm: {
                                name: "ECDSA",
                                hash: {
                                    name: "SHA-256"
                                }
                            },
                            usages: ["sign"]
                        };
                        break;
                    default:
                        return {
                            algorithm: {
                                name: "ECDSA"
                            },
                            usages: []
                        };
                }
                break;
            case "ECDH":
                switch(operation.toLowerCase())
                {
                    case "exportkey":
                    case "importkey":
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "ECDH",
                                namedCurve: "P-256"
                            },
                            usages: ["deriveKey", "deriveBits"]
                        };
                        break;
                    case "derivekey":
                    case "derivebits":
                        result = {
                            algorithm: {
                                name: "ECDH",
                                namedCurve: "P-256",
                                public: [] // Must be a "publicKey"
                            },
                            usages: ["encrypt", "decrypt"]
                        };
                        break;
                    default:
                        return {
                            algorithm: {
                                name: "ECDH"
                            },
                            usages: []
                        };
                }
                break;
            case "AES-CTR":
                switch(operation.toLowerCase())
                {
                    case "importkey":
                    case "exportkey":
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "AES-CTR",
                                length: 256
                            },
                            usages: ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
                        };
                        break;
                    case "decrypt":
                    case "encrypt":
                        result = {
                            algorithm: {
                                name: "AES-CTR",
                                counter: new Uint8Array(16),
                                length: 10
                            },
                            usages: ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
                        };
                    default:
                        return {
                            algorithm: {
                                name: "AES-CTR"
                            },
                            usages: []
                        };
                }
                break;
            case "AES-CBC":
                switch(operation.toLowerCase())
                {
                    case "importkey":
                    case "exportkey":
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "AES-CBC",
                                length: 256
                            },
                            usages: ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
                        };
                        break;
                    case "decrypt":
                    case "encrypt":
                        result = {
                            algorithm: {
                                name: "AES-CBC",
                                iv: in_window.org.pkijs.getRandomValues(new Uint8Array(16)) // For "decrypt" the value should be replaced with value got on "encrypt" step
                            },
                            usages: ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
                        };
                    default:
                        return {
                            algorithm: {
                                name: "AES-CBC"
                            },
                            usages: []
                        };
                }
                break;
            case "AES-GCM":
                switch(operation.toLowerCase())
                {
                    case "importkey":
                    case "exportkey":
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "AES-GCM",
                                length: 256
                            },
                            usages: ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
                        };
                        break;
                    case "decrypt":
                    case "encrypt":
                        result = {
                            algorithm: {
                                name: "AES-GCM",
                                iv: in_window.org.pkijs.getRandomValues(new Uint8Array(16)) // For "decrypt" the value should be replaced with value got on "encrypt" step
                            },
                            usages: ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
                        };
                    default:
                        return {
                            algorithm: {
                                name: "AES-GCM"
                            },
                            usages: []
                        };
                }
                break;
            case "AES-KW":
                switch(operation.toLowerCase())
                {
                    case "importkey":
                    case "exportkey":
                    case "generatekey":
                    case "wrapkey":
                    case "unwrapkey":
                        result = {
                            algorithm: {
                                name: "AES-KW",
                                length: 256
                            },
                            usages: ["wrapKey", "unwrapKey"]
                        };
                        break;
                    default:
                        return {
                            algorithm: {
                                name: "AES-KW"
                            },
                            usages: []
                        };
                }
                break;
            case "HMAC":
                switch(operation.toLowerCase())
                {
                    case "sign":
                    case "verify":
                        result = {
                            algorithm: {
                                name: "HMAC",
                            },
                            usages: ["sign", "verify"]
                        };
                        break;
                    case "importkey":
                    case "exportkey":
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "HMAC",
                                length: 10,
                                hash: {
                                    name: "SHA-256"
                                }
                            },
                            usages: ["sign", "verify"]
                        };
                        break;
                    default:
                        return {
                            algorithm: {
                                name: "HMAC"
                            },
                            usages: []
                        };
                }
                break;
            case "HKDF":
                switch(operation.toLowerCase())
                {
                    case "derivekey":
                        result = {
                            algorithm: {
                                name: "HKDF",
                                hash: "SHA-256",
                                salt: new Uint8Array(),
                                info: new Uint8Array()
                            },
                            usages: ["encrypt", "decrypt"]
                        };
                        break;
                    default:
                        return {
                            algorithm: {
                                name: "HKDF"
                            },
                            usages: []
                        };
                }
                break;
            case "PBKDF2":
                switch(operation.toLowerCase())
                {
                    case "derivekey":
                        result = {
                            algorithm: {
                                name: "PBKDF2",
                                hash: { name: "SHA-256" },
                                salt: new Uint8Array(),
                                iterations: 1000
                            },
                            usages: ["encrypt", "decrypt"]
                        };
                        break;
                    default:
                        return {
                            algorithm: {
                                name: "PBKDF2"
                            },
                            usages: []
                        };
                }
                break;
            default:
                ;
        }

        return result;
    }
    //**************************************************************************************
    in_window.org.pkijs.getOIDByAlgorithm =
    function(algorithm)
    {
        /// <summary>Get OID for each specific WebCrypto algorithm</summary>
        /// <param name="algorithm" type="Object">WebCrypto algorithm</param>

        var result = "";

        switch(algorithm.name.toUpperCase())
        {
            case "RSASSA-PKCS1-V1_5":
                switch(algorithm.hash.name.toUpperCase())
                {
                    case "SHA-1":
                        result = "1.2.840.113549.1.1.5";
                        break;
                    case "SHA-256":
                        result = "1.2.840.113549.1.1.11";
                        break;
                    case "SHA-384":
                        result = "1.2.840.113549.1.1.12";
                        break;
                    case "SHA-512":
                        result = "1.2.840.113549.1.1.13";
                        break;
                    default:;
                }
                break;
            case "RSA-PSS":
                result = "1.2.840.113549.1.1.10";
                break;
            case "RSA-OAEP":
                result = "1.2.840.113549.1.1.7";
                break;
            case "ECDSA":
                switch(algorithm.hash.name.toUpperCase())
                {
                    case "SHA-1":
                        result = "1.2.840.10045.4.1";
                        break;
                    case "SHA-256":
                        result = "1.2.840.10045.4.3.2";
                        break;
                    case "SHA-384":
                        result = "1.2.840.10045.4.3.3";
                        break;
                    case "SHA-512":
                        result = "1.2.840.10045.4.3.4";
                        break;
                    default:;
                }
                break;
            case "ECDH":
                switch(algorithm.kdf.toUpperCase()) // Non-standard addition - hash algorithm of KDF function
                {
                    case "SHA-1":
                        result = "1.3.133.16.840.63.0.2"; // dhSinglePass-stdDH-sha1kdf-scheme
                        break;
                    case "SHA-256":
                        result = "1.3.132.1.11.1"; // dhSinglePass-stdDH-sha256kdf-scheme
                        break;
                    case "SHA-384":
                        result = "1.3.132.1.11.2"; // dhSinglePass-stdDH-sha384kdf-scheme
                        break;
                    case "SHA-512":
                        result = "1.3.132.1.11.3"; // dhSinglePass-stdDH-sha512kdf-scheme
                        break;
                    default:;
                }
                break;
            case "AES-CTR":
                break;
            case "AES-CBC":
                switch(algorithm.length)
                {
                    case 128:
                        result = "2.16.840.1.101.3.4.1.2";
                        break;
                    case 192:
                        result = "2.16.840.1.101.3.4.1.22";
                        break;
                    case 256:
                        result = "2.16.840.1.101.3.4.1.42";
                        break;
                    default:;
                }
                break;
            case "AES-CMAC":
                break;
            case "AES-GCM":
                switch(algorithm.length)
                {
                    case 128:
                        result = "2.16.840.1.101.3.4.1.6";
                        break;
                    case 192:
                        result = "2.16.840.1.101.3.4.1.26";
                        break;
                    case 256:
                        result = "2.16.840.1.101.3.4.1.46";
                        break;
                    default:;
                }
                break;
            case "AES-CFB":
                switch(algorithm.length)
                {
                    case 128:
                        result = "2.16.840.1.101.3.4.1.4";
                        break;
                    case 192:
                        result = "2.16.840.1.101.3.4.1.24";
                        break;
                    case 256:
                        result = "2.16.840.1.101.3.4.1.44";
                        break;
                    default:;
                }
                break;
            case "AES-KW":
                switch(algorithm.length)
                {
                    case 128:
                        result = "2.16.840.1.101.3.4.1.5";
                        break;
                    case 192:
                        result = "2.16.840.1.101.3.4.1.25";
                        break;
                    case 256:
                        result = "2.16.840.1.101.3.4.1.45";
                        break;
                    default:;
                }
                break;
            case "HMAC":
                switch(algorithm.hash.name.toUpperCase())
                {
                    case "SHA-1":
                        result = "1.2.840.113549.2.7";
                        break;
                    case "SHA-256":
                        result = "1.2.840.113549.2.9";
                        break;
                    case "SHA-384":
                        result = "1.2.840.113549.2.10";
                        break;
                    case "SHA-512":
                        result = "1.2.840.113549.2.11";
                        break;
                    default:;
                }
                break;
            case "DH":
                result = "1.2.840.113549.1.9.16.3.5";
                break;
            case "SHA-1":
                result = "1.3.14.3.2.26";
                break;
            case "SHA-256":
                result = "2.16.840.1.101.3.4.2.1";
                break;
            case "SHA-384":
                result = "2.16.840.1.101.3.4.2.2";
                break;
            case "SHA-512":
                result = "2.16.840.1.101.3.4.2.3";
                break;
            case "CONCAT":
                break;
            case "HKDF":
                break;
            case "PBKDF2":
                result = "1.2.840.113549.1.5.12";
                break;
            // #region Special case - OIDs for ECC curves
            case "P-256":
                result = "1.2.840.10045.3.1.7";
                break;
            case "P-384":
                result = "1.3.132.0.34";
                break;
            case "P-521":
                result = "1.3.132.0.35";
                break;
            // #endregion
            default:;
        }

        return result;
    }
    //**************************************************************************************
    in_window.org.pkijs.getAlgorithmByOID =
    function(oid)
    {
        /// <summary>Get WebCrypto algorithm by wel-known OID</summary>
        /// <param name="oid" type="String">Wel-known OID to search for</param>

        var result = {};

        switch(oid)
        {
            case "1.2.840.113549.1.1.5":
                result = {
                    name: "RSASSA-PKCS1-v1_5",
                    hash: {
                        name: "SHA-1"
                    }
                };
                break;
            case "1.2.840.113549.1.1.11":
                result = {
                    name: "RSASSA-PKCS1-v1_5",
                    hash: {
                        name: "SHA-256"
                    }
                };
                break;
            case "1.2.840.113549.1.1.12":
                result = {
                    name: "RSASSA-PKCS1-v1_5",
                    hash: {
                        name: "SHA-384"
                    }
                };
                break;
            case "1.2.840.113549.1.1.13":
                result = {
                    name: "RSASSA-PKCS1-v1_5",
                    hash: {
                        name: "SHA-512"
                    }
                };
                break;
            case "1.2.840.113549.1.1.10":
                result = {
                    name: "RSA-PSS"
                };
                break;
            case "1.2.840.113549.1.1.7":
                result = {
                    name: "RSA-OAEP"
                };
                break;
            case "1.2.840.10045.4.1":
                result = {
                    name: "ECDSA",
                    hash: {
                        name: "SHA-1"
                    }
                };
                break;
            case "1.2.840.10045.4.3.2":
                result = {
                    name: "ECDSA",
                    hash: {
                        name: "SHA-256"
                    }
                };
                break;
            case "1.2.840.10045.4.3.3":
                result = {
                    name: "ECDSA",
                    hash: {
                        name: "SHA-384"
                    }
                };
                break;
            case "1.2.840.10045.4.3.4":
                result = {
                    name: "ECDSA",
                    hash: {
                        name: "SHA-512"
                    }
                };
                break;
            case "1.3.133.16.840.63.0.2":
                result = {
                    name: "ECDH",
                    kdf: "SHA-1"
                };
                break;
            case "1.3.132.1.11.1":
                result = {
                    name: "ECDH",
                    kdf: "SHA-256"
                };
                break;
            case "1.3.132.1.11.2":
                result = {
                    name: "ECDH",
                    kdf: "SHA-384"
                };
                break;
            case "1.3.132.1.11.3":
                result = {
                    name: "ECDH",
                    kdf: "SHA-512"
                };
                break;
            case "2.16.840.1.101.3.4.1.2":
                result = {
                    name: "AES-CBC",
                    length: 128
                };
                break;
            case "2.16.840.1.101.3.4.1.22":
                result = {
                    name: "AES-CBC",
                    length: 192
                };
                break;
            case "2.16.840.1.101.3.4.1.42":
                result = {
                    name: "AES-CBC",
                    length: 256
                };
                break;
            case "2.16.840.1.101.3.4.1.6":
                result = {
                    name: "AES-GCM",
                    length: 128
                };
                break;
            case "2.16.840.1.101.3.4.1.26":
                result = {
                    name: "AES-GCM",
                    length: 192
                };
                break;
            case "2.16.840.1.101.3.4.1.46":
                result = {
                    name: "AES-GCM",
                    length: 256
                };
                break;
            case "2.16.840.1.101.3.4.1.4":
                result = {
                    name: "AES-CFB",
                    length: 128
                };
                break;
            case "2.16.840.1.101.3.4.1.24":
                result = {
                    name: "AES-CFB",
                    length: 192
                };
                break;
            case "2.16.840.1.101.3.4.1.44":
                result = {
                    name: "AES-CFB",
                    length: 256
                };
                break;
            case "2.16.840.1.101.3.4.1.5":
                result = {
                    name: "AES-KW",
                    length: 128
                };
                break;
            case "2.16.840.1.101.3.4.1.25":
                result = {
                    name: "AES-KW",
                    length: 192
                };
                break;
            case "2.16.840.1.101.3.4.1.45":
                result = {
                    name: "AES-KW",
                    length: 256
                };
                break;
            case "1.2.840.113549.2.7":
                result = {
                    name: "HMAC",
                    hash: {
                        name: "SHA-1"
                    }
                };
                break;
            case "1.2.840.113549.2.9":
                result = {
                    name: "HMAC",
                    hash: {
                        name: "SHA-256"
                    }
                };
                break;
            case "1.2.840.113549.2.10":
                result = {
                    name: "HMAC",
                    hash: {
                        name: "SHA-384"
                    }
                };
                break;
            case "1.2.840.113549.2.11":
                result = {
                    name: "HMAC",
                    hash: {
                        name: "SHA-512"
                    }
                };
                break;
            case "1.2.840.113549.1.9.16.3.5":
                result = {
                    name: "DH"
                };
                break;
            case "1.3.14.3.2.26":
                result = {
                    name: "SHA-1"
                };
                break;
            case "2.16.840.1.101.3.4.2.1":
                result = {
                    name: "SHA-256"
                };
                break;
            case "2.16.840.1.101.3.4.2.2":
                result = {
                    name: "SHA-384"
                };
                break;
            case "2.16.840.1.101.3.4.2.3":
                result = {
                    name: "SHA-512"
                };
                break;
            case "1.2.840.113549.1.5.12":
                result = {
                    name: "PBKDF2"
                };
                break;
            // #region Special case - OIDs for ECC curves
            case "1.2.840.10045.3.1.7":
                result = {
                    name: "P-256"
                };
                break;
            case "1.3.132.0.34":
                result = {
                    name: "P-384"
                };
                break;
            case "1.3.132.0.35":
                result = {
                    name: "P-521"
                };
                break;
            // #endregion
            default:;
        }

        return result;
    }
    //**************************************************************************************
    in_window.org.pkijs.getHashAlgorithm =
    function(signatureAlgorithm)
    {
        /// <summary>Getting hash algorithm by signature algorithm</summary>
        /// <param name="signatureAlgorithm" type="in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER">Signature algorithm</param>

        var result = "";

        switch(signatureAlgorithm.algorithm_id)
        {
            case "1.2.840.10045.4.1": // ecdsa-with-SHA1
            case "1.2.840.113549.1.1.5":
                result = "SHA-1";
                break;
            case "1.2.840.10045.4.3.2": // ecdsa-with-SHA256
            case "1.2.840.113549.1.1.11":
                result = "SHA-256";
                break;
            case "1.2.840.10045.4.3.3": // ecdsa-with-SHA384
            case "1.2.840.113549.1.1.12":
                result = "SHA-384";
                break;
            case "1.2.840.10045.4.3.4": // ecdsa-with-SHA512
            case "1.2.840.113549.1.1.13":
                result = "SHA-512";
                break;
            case "1.2.840.113549.1.1.10": // RSA-PSS
                {
                    var params;

                    try
                    {
                        params = new in_window.org.pkijs.simpl.x509.RSASSA_PSS_params({ schema: signatureAlgorithm.algorithm_params });
                        if("hashAlgorithm" in params)
                        {
                            var algorithm = in_window.org.pkijs.getAlgorithmByOID(params.hashAlgorithm.algorithm_id);
                            if(("name" in algorithm) === false)
                                return "";

                            result = algorithm.name;
                        }
                        else
                            result = "SHA-1";
                    }
                    catch(ex)
                    {
                    }
                }
                break;
            default:;
        }

        return result;
    }
    //**************************************************************************************
    in_window.org.pkijs.createCMSECDSASignature =
    function(signatureBuffer)
    {
        /// <summary>Create CMS ECDSA signature from WebCrypto ECDSA signature</summary>
        /// <param name="signatureBuffer" type="ArrayBuffer">WebCrypto result of "sign" function</param>

        // #region Initial check for correct length
        if((signatureBuffer.byteLength % 2) != 0)
            return new ArrayBuffer(0);
        // #endregion

        // #region Initial variables
        var i = 0;
        var length = signatureBuffer.byteLength / 2; // There are two equal parts inside incoming ArrayBuffer

        var signatureView = new Uint8Array(signatureBuffer);

        var r_buffer = new ArrayBuffer(length);
        var r_view = new Uint8Array(r_buffer);
        var r_corrected_buffer;
        var r_corrected_view;

        var s_buffer = new ArrayBuffer(length);
        var s_view = new Uint8Array(s_buffer);
        var s_corrected_buffer;
        var s_corrected_view;
        // #endregion

        // #region Get "r" part of ECDSA signature
        for(; i < length; i++)
            r_view[i] = signatureView[i];

        if(r_view[0] & 0x80)
        {
            r_corrected_buffer = new ArrayBuffer(length + 1);
            r_corrected_view = new Uint8Array(r_corrected_buffer);

            r_corrected_view[0] = 0x00;

            for(var j = 0; j < length; j++)
                r_corrected_view[j + 1] = r_view[j];
        }
        else
        {
            r_corrected_buffer = r_buffer;
            r_corrected_view = r_view;
        }
        // #endregion

        // #region Get "s" part of ECDSA signature
        for(; i < signatureBuffer.byteLength; i++)
            s_view[i - length] = signatureView[i];


        if(s_view[0] & 0x80)
        {
            s_corrected_buffer = new ArrayBuffer(length + 1);
            s_corrected_view = new Uint8Array(s_corrected_buffer);

            s_corrected_view[0] = 0x00;

            for(var j = 0; j < length; j++)
                s_corrected_view[j + 1] = s_view[j];
        }
        else
        {
            s_corrected_buffer = s_buffer;
            s_corrected_view = s_view;
        }
        // #endregion

        // #region Create ASN.1 structure of CMS ECDSA signature
        var r_integer = new in_window.org.pkijs.asn1.INTEGER();
        r_integer.value_block.is_hex_only = true;
        r_integer.value_block.value_hex = in_window.org.pkijs.copyBuffer(r_corrected_buffer);

        var s_integer = new in_window.org.pkijs.asn1.INTEGER();
        s_integer.value_block.is_hex_only = true;
        s_integer.value_block.value_hex = in_window.org.pkijs.copyBuffer(s_corrected_buffer);

        var asn1 = new in_window.org.pkijs.asn1.SEQUENCE({
            value: [
                r_integer,
                s_integer
            ]
        });
        // #endregion

        return asn1.toBER(false);
    }
    //**************************************************************************************
    in_window.org.pkijs.createECDSASignatureFromCMS =
    function(cmsSignature)
    {
        /// <summary>Create a single ArrayBuffer from CMS ECDSA signature</summary>
        /// <param name="cmsSignature" type="in_window.org.pkijs.asn1.SEQUENCE">ASN.1 SEQUENCE contains CMS ECDSA signature</param>

        // #region Initial variables
        var length = 0;

        var r_start = 0;
        var s_start = 0;

        var r_length = cmsSignature.value_block.value[0].value_block.value_hex.byteLength;
        var s_length = cmsSignature.value_block.value[1].value_block.value_hex.byteLength;
        // #endregion

        // #region Get length of final "ArrayBuffer"
        var r_view = new Uint8Array(cmsSignature.value_block.value[0].value_block.value_hex);
        if((r_view[0] === 0x00) && (r_view[1] & 0x80))
        {
            length = r_length - 1;
            r_start = 1;
        }
        else
            length = r_length;

        var s_view = new Uint8Array(cmsSignature.value_block.value[1].value_block.value_hex);
        if((s_view[0] === 0x00) && (s_view[1] & 0x80))
        {
            length += s_length - 1;
            s_start = 1;
        }
        else
            length += s_length;
        // #endregion

        // #region Copy values from CMS ECDSA signature
        var result = new ArrayBuffer(length);
        var result_view = new Uint8Array(result);

        for(var i = r_start; i < r_length; i++)
            result_view[i - r_start] = r_view[i];

        for(var i = s_start; i < s_length; i++)
            result_view[i - s_start + r_length - r_start] = s_view[i];
        // #endregion

        return result;
    }
    //**************************************************************************************
    in_window.org.pkijs.getEncryptionAlgorithm =
    function(algorithm)
    {
        /// <summary>Get encryption algorithm OID by WebCrypto algorithm's object</summary>
        /// <param name="algorithm" type="WebCryptoAlgorithm">WebCrypto algorithm object</param>

        var result = "";

        switch(algorithm.name.toUpperCase())
        {
            case "AES-CBC":
                switch(algorithm.length)
                {
                    case 128:
                        result = "2.16.840.1.101.3.4.1.2";
                        break;
                    case 192:
                        result = "2.16.840.1.101.3.4.1.22";
                        break;
                    case 256:
                        result = "2.16.840.1.101.3.4.1.42";
                        break;
                    default:;
                }
                break;
            case "AES-GCM":
                switch(algorithm.length)
                {
                    case 128:
                        result = "2.16.840.1.101.3.4.1.6";
                        break;
                    case 192:
                        result = "2.16.840.1.101.3.4.1.26";
                        break;
                    case 256:
                        result = "2.16.840.1.101.3.4.1.46";
                        break;
                    default:;
                }
                break;
            default:;
        }

        return result;
    }
    //**************************************************************************************
    in_window.org.pkijs.getAlgorithmByEncryptionOID =
    function(oid)
    {
        /// <summary>Get encryption algorithm name by OID</summary>
        /// <param name="oid" type="String">OID of encryption algorithm</param>

        var result = "";

        switch(oid)
        {
            case "2.16.840.1.101.3.4.1.2":
            case "2.16.840.1.101.3.4.1.22":
            case "2.16.840.1.101.3.4.1.42":
                result = "AES-CBC";
                break;
            case "2.16.840.1.101.3.4.1.6":
            case "2.16.840.1.101.3.4.1.26":
            case "2.16.840.1.101.3.4.1.46":
                result = "AES-GCM";
                break;
            default:;
        }

        return result;
    }
    //**************************************************************************************
    // #endregion
    //**************************************************************************************
}
)(typeof exports !== "undefined" ? exports : window);

//third_party/javascript/pkijs/common.js
/**
 * @license
 * Copyright (c) 2014, GMO GlobalSign
 * Copyright (c) 2015, Peculiar Ventures
 * All rights reserved.
 *
 * Author 2014-2015, Yury Strozhevsky <www.strozhevsky.com>.
 *
 * Redistribution and use in source and binary forms, with or without modification, 
 * are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, 
 *    this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice, 
 *    this list of conditions and the following disclaimer in the documentation 
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors 
 *    may be used to endorse or promote products derived from this software without 
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND 
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED 
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. 
 * IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, 
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT 
 * NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR 
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, 
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY 
 * OF SUCH DAMAGE. 
 *
 */
(
function(in_window)
{
    //**************************************************************************************
    // #region Declaration of global variables 
    //**************************************************************************************
    // #region "org" namespace 
    if(typeof in_window.org === "undefined")
        in_window.org = {};
    else
    {
        if(typeof in_window.org !== "object")
            throw new Error("Name org already exists and it's not an object");
    }
    // #endregion 

    // #region "org.pkijs" namespace 
    if(typeof in_window.org.pkijs === "undefined")
        in_window.org.pkijs = {};
    else
    {
        if(typeof in_window.org.pkijs !== "object")
            throw new Error("Name org.pkijs already exists and it's not an object" + " but " + (typeof in_window.org.pkijs));
    }
    // #endregion 

    // #region "local" namespace 
    var local = {};
    // #endregion   
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Declaration of common functions 
    //**************************************************************************************
    in_window.org.pkijs.emptyObject =
    function()
    {
        this.toJSON = function()
        {
            return {};
        };
        this.toSchema = function()
        {
            return {};
        };
    }
    //**************************************************************************************
    in_window.org.pkijs.getNames =
    function(arg)
    {
        /// <summary>Get correct "names" array for all "schema" objects</summary>

        var names = {};

        if(arg instanceof Object)
            names = (arg.names || {});

        return names;
    }
    //**************************************************************************************
    in_window.org.pkijs.inheriteObjectFields =
    function(from)
    {
        for(i in from.prototype)
        {
            if(typeof from.prototype[i] === "function")
                continue;

            this[i] = from.prototype[i];
        }
    }
    //**************************************************************************************
    in_window.org.pkijs.getUTCDate =
    function(date)
    {
        /// <summary>Making UTC date from local date</summary>
        /// <param name="date" type="Date">Date to convert from</param>

        var current_date = date;
        return new Date(current_date.getTime() + (current_date.getTimezoneOffset() * 60000));
    }
    //**************************************************************************************
    in_window.org.pkijs.padNumber =
    function(input_number, full_length)
    {
        var str = input_number.toString(10);
        var dif = full_length - str.length;

        var padding = new Array(dif);
        for(var i = 0; i < dif; i++)
            padding[i] = '0';

        var padding_string = padding.join('');

        return padding_string.concat(str);
    }
    //**************************************************************************************
    in_window.org.pkijs.getValue =
    function(args, item, default_value)
    {
        if(item in args)
            return args[item];
        else
            return default_value;
    }
    //**************************************************************************************
    in_window.org.pkijs.isEqual_view =
    function(input_view1, input_view2)
    {
        /// <summary>Compare two Uint8Arrays</summary>
        /// <param name="input_view1" type="Uint8Array">First Uint8Array for comparision</param>
        /// <param name="input_view2" type="Uint8Array">Second Uint8Array for comparision</param>

        if(input_view1.length !== input_view2.length)
            return false;

        for(var i = 0; i < input_view1.length; i++)
        {
            if(input_view1[i] != input_view2[i])
                return false;
        }

        return true;
    }
    //**************************************************************************************
    in_window.org.pkijs.isEqual_buffer =
    function(input_buffer1, input_buffer2)
    {
        /// <summary>Compare two array buffers</summary>
        /// <param name="input_buffer1" type="ArrayBuffer">First ArrayBuffer for comparision</param>
        /// <param name="input_buffer2" type="ArrayBuffer">Second ArrayBuffer for comparision</param>

        if(input_buffer1.byteLength != input_buffer2.byteLength)
            return false;

        var view1 = new Uint8Array(input_buffer1);
        var view2 = new Uint8Array(input_buffer2);

        return in_window.org.pkijs.isEqual_view(view1, view2);
    }
    //**************************************************************************************
    in_window.org.pkijs.concat_buffers =
    function(input_buf1, input_buf2)
    {
        /// <summary>Concatenate two ArrayBuffers</summary>
        /// <param name="input_buf1" type="ArrayBuffer">First ArrayBuffer (first part of concatenated array)</param>
        /// <param name="input_buf2" type="ArrayBuffer">Second ArrayBuffer (second part of concatenated array)</param>

        var input_view1 = new Uint8Array(input_buf1);
        var input_view2 = new Uint8Array(input_buf2);

        var ret_buf = new ArrayBuffer(input_buf1.byteLength + input_buf2.byteLength);
        var ret_view = new Uint8Array(ret_buf);

        for(var i = 0; i < input_buf1.byteLength; i++)
            ret_view[i] = input_view1[i];

        for(var j = 0; j < input_buf2.byteLength; j++)
            ret_view[input_buf1.byteLength + j] = input_view2[j];

        return ret_buf;
    }
    //**************************************************************************************
    in_window.org.pkijs.copyBuffer =
    function(input_buffer)
    {
        var result = new ArrayBuffer(input_buffer.byteLength);

        var resultView = new Uint8Array(result);
        var inputView = new Uint8Array(input_buffer);

        for(var i = 0; i < inputView.length; i++)
            resultView[i] = inputView[i];

        return result;
    }
    //**************************************************************************************
    in_window.org.pkijs.getCrypto =
    function()
    {
        var crypto_temp;

        if("crypto" in in_window)
        {
            // Apple Safari support
            if("webkitSubtle" in in_window.crypto)
                crypto_temp = in_window.crypto.webkitSubtle;

            if("subtle" in in_window.crypto)
                crypto_temp = in_window.crypto.subtle;
        }

        return crypto_temp;
    }
    //**************************************************************************************
    in_window.org.pkijs.stringPrep =
    function(input_string)
    {
        /// <summary>String preparation function. In a future here will be realization of algorithm from RFC4518.</summary>
        /// <param name="input_string" type="String">JavaScript string. As soon as for each ASN.1 string type we have a specific transformation function here we will work with pure JavaScript string</param>
        /// <returns type="String">Formated string</returns>

        var result = input_string.replace(/^\s+|\s+$/g, ""); // Trim input string
        result = result.replace(/\s+/g, " "); // Change all sequence of SPACE down to SPACE char
        result = result.toLowerCase();

        return result;
    }
    //**************************************************************************************
    in_window.org.pkijs.bufferToHexCodes =
    function(input_buffer, input_offset, input_lenght)
    {
        var result = "";

        var int_buffer = new Uint8Array(input_buffer, input_offset, input_lenght);

        for(var i = 0; i < int_buffer.length; i++)
        {
            var str = int_buffer[i].toString(16).toUpperCase();
            result = result + ((str.length === 1) ? "0" : "") + str;
        }

        return result;
    }
    //**************************************************************************************
    in_window.org.pkijs.bufferFromHexCodes =
    function(hexString)
    {
        /// <summary>Create an ArrayBuffer from string having hexdecimal codes</summary>
        /// <param name="hexString" type="String">String to create ArrayBuffer from</param>

        // #region Initial variables 
        var stringLength = hexString.length;

        var resultBuffer = new ArrayBuffer(stringLength >> 1);
        var resultView = new Uint8Array(resultBuffer);

        var hex_map = {};

        hex_map['0'] = 0x00;
        hex_map['1'] = 0x01;
        hex_map['2'] = 0x02;
        hex_map['3'] = 0x03;
        hex_map['4'] = 0x04;
        hex_map['5'] = 0x05;
        hex_map['6'] = 0x06;
        hex_map['7'] = 0x07;
        hex_map['8'] = 0x08;
        hex_map['9'] = 0x09;
        hex_map['A'] = 0x0A;
        hex_map['a'] = 0x0A;
        hex_map['B'] = 0x0B;
        hex_map['b'] = 0x0B;
        hex_map['C'] = 0x0C;
        hex_map['c'] = 0x0C;
        hex_map['D'] = 0x0D;
        hex_map['d'] = 0x0D;
        hex_map['E'] = 0x0E;
        hex_map['e'] = 0x0E;
        hex_map['F'] = 0x0F;
        hex_map['f'] = 0x0F;

        var j = 0;
        var temp = 0x00;
        // #endregion 

        // #region Convert char-by-char 
        for(var i = 0; i < stringLength; i++)
        {
            if(!(i % 2))
                temp = hex_map[hexString.charAt(i)] << 4;
            else
            {
                temp |= hex_map[hexString.charAt(i)];

                resultView[j] = temp;
                j++;
            }
        }
        // #endregion 

        return resultBuffer;
    }
    //**************************************************************************************
    in_window.org.pkijs.getRandomValues =
    function(view)
    {
        /// <param name="view" type="Uint8Array">New array which gives a length for random value</param>

        if("crypto" in in_window)
            return in_window.crypto.getRandomValues(view);
        else
            throw new Error("No support for Web Cryptography API");
    }
    //**************************************************************************************
    in_window.org.pkijs.getAlgorithmParameters =
    function(algorithmName, operation)
    {
        /// <param name="algorithmName" type="String">Algorithm name to get common parameters for</param>
        /// <param name="operation" type="String">Kind of operation: "sign", "encrypt", "generatekey", "importkey", "exportkey", "verify"</param>

        var result = {
            algorithm: {},
            usages: []
        };

        switch(algorithmName.toUpperCase())
        {
            case "RSASSA-PKCS1-V1_5":
                switch(operation.toLowerCase())
                {
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "RSASSA-PKCS1-v1_5",
                                modulusLength: 2048,
                                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                                hash: {
                                    name: "SHA-256"
                                },
                            },
                            usages: ["sign", "verify"]
                        };
                        break;
                    case "verify":
                    case "sign":
                    case "importkey":
                        result = {
                            algorithm: {
                                name: "RSASSA-PKCS1-v1_5",
                                hash: {
                                    name: "SHA-256"
                                },
                            },
                            usages: ["verify"] // For importKey("pkcs8") usage must be "sign" only
                        };
                        break;
                    case "exportkey":
                    default:
                        return {
                            algorithm: {
                                name: "RSASSA-PKCS1-v1_5"
                            },
                            usages: []
                        };
                }
                break;
            case "RSA-PSS":
                switch(operation.toLowerCase())
                {
                    case "sign":
                    case "verify":
                        result = {
                            algorithm: {
                                name: "RSA-PSS",
                                hash: {
                                    name: "SHA-1"
                                },
                                saltLength: 20
                            },
                            usages: ["sign", "verify"]
                        };
                        break;
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "RSA-PSS",
                                modulusLength: 2048,
                                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                                hash: {
                                    name: "SHA-1"
                                }
                            },
                            usages: ["sign", "verify"]
                        };
                        break;
                    case "importkey":
                        result = {
                            algorithm: {
                                name: "RSA-PSS",
                                hash: {
                                    name: "SHA-1"
                                },
                            },
                            usages: ["verify"] // For importKey("pkcs8") usage must be "sign" only
                        };
                        break;
                    case "exportkey":
                    default:
                        return {
                            algorithm: {
                                name: "RSA-PSS"
                            },
                            usages: []
                        };
                }
                break;
            case "RSA-OAEP":
                switch(operation.toLowerCase())
                {
                    case "encrypt":
                    case "decrypt":
                        result = {
                            algorithm: {
                                name: "RSA-OAEP",
                            },
                            usages: ["encrypt", "decrypt"]
                        };
                        break;
                        break;
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "RSA-OAEP",
                                modulusLength: 2048,
                                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                                hash: {
                                    name: "SHA-256"
                                }
                            },
                            usages: ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
                        };
                        break;
                    case "importkey":
                        result = {
                            algorithm: {
                                name: "RSA-OAEP",
                                hash: {
                                    name: "SHA-256"
                                }
                            },
                            usages: ["encrypt"] // encrypt for "spki" and decrypt for "pkcs8"
                        };
                        break;
                    case "exportkey":
                    default:
                        return {
                            algorithm: {
                                name: "RSA-OAEP"
                            },
                            usages: []
                        };
                }
                break;
            case "ECDSA":
                switch(operation.toLowerCase())
                {
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "ECDSA",
                                namedCurve: "P-256"
                            },
                            usages: ["sign", "verify"]
                        };
                        break;
                    case "importkey":
                        result = {
                            algorithm: {
                                name: "ECDSA",
                                namedCurve: "P-256"
                            },
                            usages: ["verify"] // "sign" for "pkcs8"
                        };
                        break;
                    case "verify":
                    case "sign":
                        result = {
                            algorithm: {
                                name: "ECDSA",
                                hash: {
                                    name: "SHA-256"
                                }
                            },
                            usages: ["sign"]
                        };
                        break;
                    default:
                        return {
                            algorithm: {
                                name: "ECDSA"
                            },
                            usages: []
                        };
                }
                break;
            case "ECDH":
                switch(operation.toLowerCase())
                {
                    case "exportkey":
                    case "importkey":
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "ECDH",
                                namedCurve: "P-256"
                            },
                            usages: ["deriveKey", "deriveBits"]
                        };
                        break;
                    case "derivekey":
                    case "derivebits":
                        result = {
                            algorithm: {
                                name: "ECDH",
                                namedCurve: "P-256",
                                public: [] // Must be a "publicKey"
                            },
                            usages: ["encrypt", "decrypt"]
                        };
                        break;
                    default:
                        return {
                            algorithm: {
                                name: "ECDH"
                            },
                            usages: []
                        };
                }
                break;
            case "AES-CTR":
                switch(operation.toLowerCase())
                {
                    case "importkey":
                    case "exportkey":
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "AES-CTR",
                                length: 256
                            },
                            usages: ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
                        };
                        break;
                    case "decrypt":
                    case "encrypt":
                        result = {
                            algorithm: {
                                name: "AES-CTR",
                                counter: new Uint8Array(16),
                                length: 10
                            },
                            usages: ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
                        };
                    default:
                        return {
                            algorithm: {
                                name: "AES-CTR"
                            },
                            usages: []
                        };
                }
                break;
            case "AES-CBC":
                switch(operation.toLowerCase())
                {
                    case "importkey":
                    case "exportkey":
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "AES-CBC",
                                length: 256
                            },
                            usages: ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
                        };
                        break;
                    case "decrypt":
                    case "encrypt":
                        result = {
                            algorithm: {
                                name: "AES-CBC",
                                iv: in_window.org.pkijs.getRandomValues(new Uint8Array(16)) // For "decrypt" the value should be replaced with value got on "encrypt" step
                            },
                            usages: ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
                        };
                    default:
                        return {
                            algorithm: {
                                name: "AES-CBC"
                            },
                            usages: []
                        };
                }
                break;
            case "AES-GCM":
                switch(operation.toLowerCase())
                {
                    case "importkey":
                    case "exportkey":
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "AES-GCM",
                                length: 256
                            },
                            usages: ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
                        };
                        break;
                    case "decrypt":
                    case "encrypt":
                        result = {
                            algorithm: {
                                name: "AES-GCM",
                                iv: in_window.org.pkijs.getRandomValues(new Uint8Array(16)) // For "decrypt" the value should be replaced with value got on "encrypt" step
                            },
                            usages: ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
                        };
                    default:
                        return {
                            algorithm: {
                                name: "AES-GCM"
                            },
                            usages: []
                        };
                }
                break;
            case "AES-KW":
                switch(operation.toLowerCase())
                {
                    case "importkey":
                    case "exportkey":
                    case "generatekey":
                    case "wrapkey":
                    case "unwrapkey":
                        result = {
                            algorithm: {
                                name: "AES-KW",
                                length: 256
                            },
                            usages: ["wrapKey", "unwrapKey"]
                        };
                        break;
                    default:
                        return {
                            algorithm: {
                                name: "AES-KW"
                            },
                            usages: []
                        };
                }
                break;
            case "HMAC":
                switch(operation.toLowerCase())
                {
                    case "sign":
                    case "verify":
                        result = {
                            algorithm: {
                                name: "HMAC",
                            },
                            usages: ["sign", "verify"]
                        };
                        break;
                    case "importkey":
                    case "exportkey":
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "HMAC",
                                length: 10,
                                hash: {
                                    name: "SHA-256"
                                }
                            },
                            usages: ["sign", "verify"]
                        };
                        break;
                    default:
                        return {
                            algorithm: {
                                name: "HMAC"
                            },
                            usages: []
                        };
                }
                break;
            case "HKDF":
                switch(operation.toLowerCase())
                {
                    case "derivekey":
                        result = {
                            algorithm: {
                                name: "HKDF",
                                hash: "SHA-256",
                                salt: new Uint8Array(),
                                info: new Uint8Array()
                            },
                            usages: ["encrypt", "decrypt"]
                        };
                        break;
                    default:
                        return {
                            algorithm: {
                                name: "HKDF"
                            },
                            usages: []
                        };
                }
                break;
            case "PBKDF2":
                switch(operation.toLowerCase())
                {
                    case "derivekey":
                        result = {
                            algorithm: {
                                name: "PBKDF2",
                                hash: { name: "SHA-256" },
                                salt: new Uint8Array(),
                                iterations: 1000
                            },
                            usages: ["encrypt", "decrypt"]
                        };
                        break;
                    default:
                        return {
                            algorithm: {
                                name: "PBKDF2"
                            },
                            usages: []
                        };
                }
                break;
            default:
                ;
        }

        return result;
    }
    //**************************************************************************************
    in_window.org.pkijs.getOIDByAlgorithm =
    function(algorithm)
    {
        /// <summary>Get OID for each specific WebCrypto algorithm</summary>
        /// <param name="algorithm" type="Object">WebCrypto algorithm</param>

        var result = "";

        switch(algorithm.name.toUpperCase())
        {
            case "RSASSA-PKCS1-V1_5":
                switch(algorithm.hash.name.toUpperCase())
                {
                    case "SHA-1":
                        result = "1.2.840.113549.1.1.5";
                        break;
                    case "SHA-256":
                        result = "1.2.840.113549.1.1.11";
                        break;
                    case "SHA-384":
                        result = "1.2.840.113549.1.1.12";
                        break;
                    case "SHA-512":
                        result = "1.2.840.113549.1.1.13";
                        break;
                    default:;
                }
                break;
            case "RSA-PSS":
                result = "1.2.840.113549.1.1.10";
                break;
            case "RSA-OAEP":
                result = "1.2.840.113549.1.1.7";
                break;
            case "ECDSA":
                switch(algorithm.hash.name.toUpperCase())
                {
                    case "SHA-1":
                        result = "1.2.840.10045.4.1";
                        break;
                    case "SHA-256":
                        result = "1.2.840.10045.4.3.2";
                        break;
                    case "SHA-384":
                        result = "1.2.840.10045.4.3.3";
                        break;
                    case "SHA-512":
                        result = "1.2.840.10045.4.3.4";
                        break;
                    default:;
                }
                break;
            case "ECDH":
                switch(algorithm.kdf.toUpperCase()) // Non-standard addition - hash algorithm of KDF function
                {
                    case "SHA-1":
                        result = "1.3.133.16.840.63.0.2"; // dhSinglePass-stdDH-sha1kdf-scheme
                        break;
                    case "SHA-256":
                        result = "1.3.132.1.11.1"; // dhSinglePass-stdDH-sha256kdf-scheme 
                        break;
                    case "SHA-384":
                        result = "1.3.132.1.11.2"; // dhSinglePass-stdDH-sha384kdf-scheme
                        break;
                    case "SHA-512":
                        result = "1.3.132.1.11.3"; // dhSinglePass-stdDH-sha512kdf-scheme
                        break;
                    default:;
                }
                break;
            case "AES-CTR":
                break;
            case "AES-CBC":
                switch(algorithm.length)
                {
                    case 128:
                        result = "2.16.840.1.101.3.4.1.2";
                        break;
                    case 192:
                        result = "2.16.840.1.101.3.4.1.22";
                        break;
                    case 256:
                        result = "2.16.840.1.101.3.4.1.42";
                        break;
                    default:;
                }
                break;
            case "AES-CMAC":
                break;
            case "AES-GCM":
                switch(algorithm.length)
                {
                    case 128:
                        result = "2.16.840.1.101.3.4.1.6";
                        break;
                    case 192:
                        result = "2.16.840.1.101.3.4.1.26";
                        break;
                    case 256:
                        result = "2.16.840.1.101.3.4.1.46";
                        break;
                    default:;
                }
                break;
            case "AES-CFB":
                switch(algorithm.length)
                {
                    case 128:
                        result = "2.16.840.1.101.3.4.1.4";
                        break;
                    case 192:
                        result = "2.16.840.1.101.3.4.1.24";
                        break;
                    case 256:
                        result = "2.16.840.1.101.3.4.1.44";
                        break;
                    default:;
                }
                break;
            case "AES-KW":
                switch(algorithm.length)
                {
                    case 128:
                        result = "2.16.840.1.101.3.4.1.5";
                        break;
                    case 192:
                        result = "2.16.840.1.101.3.4.1.25";
                        break;
                    case 256:
                        result = "2.16.840.1.101.3.4.1.45";
                        break;
                    default:;
                }
                break;
            case "HMAC":
                switch(algorithm.hash.name.toUpperCase())
                {
                    case "SHA-1":
                        result = "1.2.840.113549.2.7";
                        break;
                    case "SHA-256":
                        result = "1.2.840.113549.2.9";
                        break;
                    case "SHA-384":
                        result = "1.2.840.113549.2.10";
                        break;
                    case "SHA-512":
                        result = "1.2.840.113549.2.11";
                        break;
                    default:;
                }
                break;
            case "DH":
                result = "1.2.840.113549.1.9.16.3.5";
                break;
            case "SHA-1":
                result = "1.3.14.3.2.26";
                break;
            case "SHA-256":
                result = "2.16.840.1.101.3.4.2.1";
                break;
            case "SHA-384":
                result = "2.16.840.1.101.3.4.2.2";
                break;
            case "SHA-512":
                result = "2.16.840.1.101.3.4.2.3";
                break;
            case "CONCAT":
                break;
            case "HKDF":
                break;
            case "PBKDF2":
                result = "1.2.840.113549.1.5.12";
                break;
            // #region Special case - OIDs for ECC curves 
            case "P-256":
                result = "1.2.840.10045.3.1.7";
                break;
            case "P-384":
                result = "1.3.132.0.34";
                break;
            case "P-521":
                result = "1.3.132.0.35";
                break;
            // #endregion 
            default:;
        }

        return result;
    }
    //**************************************************************************************
    in_window.org.pkijs.getAlgorithmByOID =
    function(oid)
    {
        /// <summary>Get WebCrypto algorithm by wel-known OID</summary>
        /// <param name="oid" type="String">Wel-known OID to search for</param>

        var result = {};

        switch(oid)
        {
            case "1.2.840.113549.1.1.5":
                result = {
                    name: "RSASSA-PKCS1-v1_5",
                    hash: {
                        name: "SHA-1"
                    }
                };
                break;
            case "1.2.840.113549.1.1.11":
                result = {
                    name: "RSASSA-PKCS1-v1_5",
                    hash: {
                        name: "SHA-256"
                    }
                };
                break;
            case "1.2.840.113549.1.1.12":
                result = {
                    name: "RSASSA-PKCS1-v1_5",
                    hash: {
                        name: "SHA-384"
                    }
                };
                break;
            case "1.2.840.113549.1.1.13":
                result = {
                    name: "RSASSA-PKCS1-v1_5",
                    hash: {
                        name: "SHA-512"
                    }
                };
                break;
            case "1.2.840.113549.1.1.10":
                result = {
                    name: "RSA-PSS"
                };
                break;
            case "1.2.840.113549.1.1.7":
                result = {
                    name: "RSA-OAEP"
                };
                break;
            case "1.2.840.10045.4.1":
                result = {
                    name: "ECDSA",
                    hash: {
                        name: "SHA-1"
                    }
                };
                break;
            case "1.2.840.10045.4.3.2":
                result = {
                    name: "ECDSA",
                    hash: {
                        name: "SHA-256"
                    }
                };
                break;
            case "1.2.840.10045.4.3.3":
                result = {
                    name: "ECDSA",
                    hash: {
                        name: "SHA-384"
                    }
                };
                break;
            case "1.2.840.10045.4.3.4":
                result = {
                    name: "ECDSA",
                    hash: {
                        name: "SHA-512"
                    }
                };
                break;
            case "1.3.133.16.840.63.0.2":
                result = {
                    name: "ECDH",
                    kdf: "SHA-1"
                };
                break;
            case "1.3.132.1.11.1":
                result = {
                    name: "ECDH",
                    kdf: "SHA-256"
                };
                break;
            case "1.3.132.1.11.2":
                result = {
                    name: "ECDH",
                    kdf: "SHA-384"
                };
                break;
            case "1.3.132.1.11.3":
                result = {
                    name: "ECDH",
                    kdf: "SHA-512"
                };
                break;
            case "2.16.840.1.101.3.4.1.2":
                result = {
                    name: "AES-CBC",
                    length: 128
                };
                break;
            case "2.16.840.1.101.3.4.1.22":
                result = {
                    name: "AES-CBC",
                    length: 192
                };
                break;
            case "2.16.840.1.101.3.4.1.42":
                result = {
                    name: "AES-CBC",
                    length: 256
                };
                break;
            case "2.16.840.1.101.3.4.1.6":
                result = {
                    name: "AES-GCM",
                    length: 128
                };
                break;
            case "2.16.840.1.101.3.4.1.26":
                result = {
                    name: "AES-GCM",
                    length: 192
                };
                break;
            case "2.16.840.1.101.3.4.1.46":
                result = {
                    name: "AES-GCM",
                    length: 256
                };
                break;
            case "2.16.840.1.101.3.4.1.4":
                result = {
                    name: "AES-CFB",
                    length: 128
                };
                break;
            case "2.16.840.1.101.3.4.1.24":
                result = {
                    name: "AES-CFB",
                    length: 192
                };
                break;
            case "2.16.840.1.101.3.4.1.44":
                result = {
                    name: "AES-CFB",
                    length: 256
                };
                break;
            case "2.16.840.1.101.3.4.1.5":
                result = {
                    name: "AES-KW",
                    length: 128
                };
                break;
            case "2.16.840.1.101.3.4.1.25":
                result = {
                    name: "AES-KW",
                    length: 192
                };
                break;
            case "2.16.840.1.101.3.4.1.45":
                result = {
                    name: "AES-KW",
                    length: 256
                };
                break;
            case "1.2.840.113549.2.7":
                result = {
                    name: "HMAC",
                    hash: {
                        name: "SHA-1"
                    }
                };
                break;
            case "1.2.840.113549.2.9":
                result = {
                    name: "HMAC",
                    hash: {
                        name: "SHA-256"
                    }
                };
                break;
            case "1.2.840.113549.2.10":
                result = {
                    name: "HMAC",
                    hash: {
                        name: "SHA-384"
                    }
                };
                break;
            case "1.2.840.113549.2.11":
                result = {
                    name: "HMAC",
                    hash: {
                        name: "SHA-512"
                    }
                };
                break;
            case "1.2.840.113549.1.9.16.3.5":
                result = {
                    name: "DH"
                };
                break;
            case "1.3.14.3.2.26":
                result = {
                    name: "SHA-1"
                };
                break;
            case "2.16.840.1.101.3.4.2.1":
                result = {
                    name: "SHA-256"
                };
                break;
            case "2.16.840.1.101.3.4.2.2":
                result = {
                    name: "SHA-384"
                };
                break;
            case "2.16.840.1.101.3.4.2.3":
                result = {
                    name: "SHA-512"
                };
                break;
            case "1.2.840.113549.1.5.12":
                result = {
                    name: "PBKDF2"
                };
                break;
            // #region Special case - OIDs for ECC curves 
            case "1.2.840.10045.3.1.7":
                result = {
                    name: "P-256"
                };
                break;
            case "1.3.132.0.34":
                result = {
                    name: "P-384"
                };
                break;
            case "1.3.132.0.35":
                result = {
                    name: "P-521"
                };
                break;
            // #endregion 
            default:;
        }

        return result;
    }
    //**************************************************************************************
    in_window.org.pkijs.getHashAlgorithm =
    function(signatureAlgorithm)
    {
        /// <summary>Getting hash algorithm by signature algorithm</summary>
        /// <param name="signatureAlgorithm" type="in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER">Signature algorithm</param>

        var result = "";

        switch(signatureAlgorithm.algorithm_id)
        {
            case "1.2.840.10045.4.1": // ecdsa-with-SHA1
            case "1.2.840.113549.1.1.5":
                result = "SHA-1";
                break;
            case "1.2.840.10045.4.3.2": // ecdsa-with-SHA256
            case "1.2.840.113549.1.1.11":
                result = "SHA-256";
                break;
            case "1.2.840.10045.4.3.3": // ecdsa-with-SHA384
            case "1.2.840.113549.1.1.12":
                result = "SHA-384";
                break;
            case "1.2.840.10045.4.3.4": // ecdsa-with-SHA512
            case "1.2.840.113549.1.1.13":
                result = "SHA-512";
                break;
            case "1.2.840.113549.1.1.10": // RSA-PSS
                {
                    var params;

                    try
                    {
                        params = new in_window.org.pkijs.simpl.x509.RSASSA_PSS_params({ schema: signatureAlgorithm.algorithm_params });
                        if("hashAlgorithm" in params)
                        {
                            var algorithm = in_window.org.pkijs.getAlgorithmByOID(params.hashAlgorithm.algorithm_id);
                            if(("name" in algorithm) === false)
                                return "";

                            result = algorithm.name;
                        }
                        else
                            result = "SHA-1";
                    }
                    catch(ex)
                    {
                    }
                }
                break;
            default:;
        }

        return result;
    }
    //**************************************************************************************
    in_window.org.pkijs.createCMSECDSASignature =
    function(signatureBuffer)
    {
        /// <summary>Create CMS ECDSA signature from WebCrypto ECDSA signature</summary>
        /// <param name="signatureBuffer" type="ArrayBuffer">WebCrypto result of "sign" function</param>

        // #region Initial check for correct length 
        if((signatureBuffer.byteLength % 2) != 0)
            return new ArrayBuffer(0);
        // #endregion 

        // #region Initial variables 
        var i = 0;
        var length = signatureBuffer.byteLength / 2; // There are two equal parts inside incoming ArrayBuffer

        var signatureView = new Uint8Array(signatureBuffer);

        var r_buffer = new ArrayBuffer(length);
        var r_view = new Uint8Array(r_buffer);
        var r_corrected_buffer;
        var r_corrected_view;

        var s_buffer = new ArrayBuffer(length);
        var s_view = new Uint8Array(s_buffer);
        var s_corrected_buffer;
        var s_corrected_view;
        // #endregion   

        // #region Get "r" part of ECDSA signature 
        for(; i < length; i++)
            r_view[i] = signatureView[i];

        if(r_view[0] & 0x80)
        {
            r_corrected_buffer = new ArrayBuffer(length + 1);
            r_corrected_view = new Uint8Array(r_corrected_buffer);

            r_corrected_view[0] = 0x00;

            for(var j = 0; j < length; j++)
                r_corrected_view[j + 1] = r_view[j];
        }
        else
        {
            r_corrected_buffer = r_buffer;
            r_corrected_view = r_view;
        }
        // #endregion 

        // #region Get "s" part of ECDSA signature 
        for(; i < signatureBuffer.byteLength; i++)
            s_view[i - length] = signatureView[i];


        if(s_view[0] & 0x80)
        {
            s_corrected_buffer = new ArrayBuffer(length + 1);
            s_corrected_view = new Uint8Array(s_corrected_buffer);

            s_corrected_view[0] = 0x00;

            for(var j = 0; j < length; j++)
                s_corrected_view[j + 1] = s_view[j];
        }
        else
        {
            s_corrected_buffer = s_buffer;
            s_corrected_view = s_view;
        }
        // #endregion 

        // #region Create ASN.1 structure of CMS ECDSA signature 
        var r_integer = new in_window.org.pkijs.asn1.INTEGER();
        r_integer.value_block.is_hex_only = true;
        r_integer.value_block.value_hex = in_window.org.pkijs.copyBuffer(r_corrected_buffer);

        var s_integer = new in_window.org.pkijs.asn1.INTEGER();
        s_integer.value_block.is_hex_only = true;
        s_integer.value_block.value_hex = in_window.org.pkijs.copyBuffer(s_corrected_buffer);

        var asn1 = new in_window.org.pkijs.asn1.SEQUENCE({
            value: [
                r_integer,
                s_integer
            ]
        });
        // #endregion   

        return asn1.toBER(false);
    }
    //**************************************************************************************
    in_window.org.pkijs.createECDSASignatureFromCMS =
    function(cmsSignature)
    {
        /// <summary>Create a single ArrayBuffer from CMS ECDSA signature</summary>
        /// <param name="cmsSignature" type="in_window.org.pkijs.asn1.SEQUENCE">ASN.1 SEQUENCE contains CMS ECDSA signature</param>

        // #region Initial variables 
        var length = 0;

        var r_start = 0;
        var s_start = 0;

        var r_length = cmsSignature.value_block.value[0].value_block.value_hex.byteLength;
        var s_length = cmsSignature.value_block.value[1].value_block.value_hex.byteLength;
        // #endregion 

        // #region Get length of final "ArrayBuffer" 
        var r_view = new Uint8Array(cmsSignature.value_block.value[0].value_block.value_hex);
        if((r_view[0] === 0x00) && (r_view[1] & 0x80))
        {
            length = r_length - 1;
            r_start = 1;
        }
        else
            length = r_length;

        var s_view = new Uint8Array(cmsSignature.value_block.value[1].value_block.value_hex);
        if((s_view[0] === 0x00) && (s_view[1] & 0x80))
        {
            length += s_length - 1;
            s_start = 1;
        }
        else
            length += s_length;
        // #endregion 

        // #region Copy values from CMS ECDSA signature 
        var result = new ArrayBuffer(length);
        var result_view = new Uint8Array(result);

        for(var i = r_start; i < r_length; i++)
            result_view[i - r_start] = r_view[i];

        for(var i = s_start; i < s_length; i++)
            result_view[i - s_start + r_length - r_start] = s_view[i];
        // #endregion 

        return result;
    }
    //**************************************************************************************
    in_window.org.pkijs.getEncryptionAlgorithm =
    function(algorithm)
    {
        /// <summary>Get encryption algorithm OID by WebCrypto algorithm's object</summary>
        /// <param name="algorithm" type="WebCryptoAlgorithm">WebCrypto algorithm object</param>

        var result = "";

        switch(algorithm.name.toUpperCase())
        {
            case "AES-CBC":
                switch(algorithm.length)
                {
                    case 128:
                        result = "2.16.840.1.101.3.4.1.2";
                        break;
                    case 192:
                        result = "2.16.840.1.101.3.4.1.22";
                        break;
                    case 256:
                        result = "2.16.840.1.101.3.4.1.42";
                        break;
                    default:;
                }
                break;
            case "AES-GCM":
                switch(algorithm.length)
                {
                    case 128:
                        result = "2.16.840.1.101.3.4.1.6";
                        break;
                    case 192:
                        result = "2.16.840.1.101.3.4.1.26";
                        break;
                    case 256:
                        result = "2.16.840.1.101.3.4.1.46";
                        break;
                    default:;
                }
                break;
            default:;
        }

        return result;
    }
    //**************************************************************************************
    in_window.org.pkijs.getAlgorithmByEncryptionOID =
    function(oid)
    {
        /// <summary>Get encryption algorithm name by OID</summary>
        /// <param name="oid" type="String">OID of encryption algorithm</param>

        var result = "";

        switch(oid)
        {
            case "2.16.840.1.101.3.4.1.2":
            case "2.16.840.1.101.3.4.1.22":
            case "2.16.840.1.101.3.4.1.42":
                result = "AES-CBC";
                break;
            case "2.16.840.1.101.3.4.1.6":
            case "2.16.840.1.101.3.4.1.26":
            case "2.16.840.1.101.3.4.1.46":
                result = "AES-GCM";
                break;
            default:;
        }

        return result;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
}
)(typeof exports !== "undefined" ? exports : window);

//third_party/javascript/pkijs/x509_schema.js
/**
 * @license
 * Copyright (c) 2014, GMO GlobalSign
 * Copyright (c) 2015, Peculiar Ventures
 * All rights reserved.
 *
 * Author 2014-2015, Yury Strozhevsky <www.strozhevsky.com>.
 *
 * Redistribution and use in source and binary forms, with or without modification, 
 * are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, 
 *    this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice, 
 *    this list of conditions and the following disclaimer in the documentation 
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors 
 *    may be used to endorse or promote products derived from this software without 
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND 
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED 
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. 
 * IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, 
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT 
 * NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR 
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, 
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY 
 * OF SUCH DAMAGE. 
 *
 */
(
function(in_window)
{
    //**************************************************************************************
    // #region Declaration of global variables 
    //**************************************************************************************
    // #region "org" namespace 
    if(typeof in_window.org === "undefined")
        in_window.org = {};
    else
    {
        if(typeof in_window.org !== "object")
            throw new Error("Name org already exists and it's not an object");
    }
    // #endregion 

    // #region "org.pkijs" namespace 
    if(typeof in_window.org.pkijs === "undefined")
        in_window.org.pkijs = {};
    else
    {
        if(typeof in_window.org.pkijs !== "object")
            throw new Error("Name org.pkijs already exists and it's not an object" + " but " + (typeof in_window.org.pkijs));
    }
    // #endregion 

    // #region "org.pkijs.schema" namespace 
    if(typeof in_window.org.pkijs.schema === "undefined")
        in_window.org.pkijs.schema = {};
    else
    {
        if(typeof in_window.org.pkijs.schema !== "object")
            throw new Error("Name org.pkijs.schema already exists and it's not an object" + " but " + (typeof in_window.org.pkijs.schema));
    }
    // #endregion 

    // #region "org.pkijs.schema.x509" namespace 
    if(typeof in_window.org.pkijs.schema.x509 === "undefined")
        in_window.org.pkijs.schema.x509 = {};
    else
    {
        if(typeof in_window.org.pkijs.schema.x509 !== "object")
            throw new Error("Name org.pkijs.schema.x509 already exists and it's not an object" + " but " + (typeof in_window.org.pkijs.schema.x509));
    }
    // #endregion 

    // #region "local" namespace 
    var local = {};
    // #endregion   
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "Time" type 
    //**************************************************************************************
    in_window.org.pkijs.schema.TIME =
    function(input_names, input_optional)
    {
        var names = in_window.org.pkijs.getNames(arguments[0]);
        var optional = (input_optional || false);

        return (new in_window.org.pkijs.asn1.CHOICE({
            optional: optional,
            value: [
                new in_window.org.pkijs.asn1.UTCTIME({ name: (names.utcTimeName || "") }),
                new in_window.org.pkijs.asn1.GENERALIZEDTIME({ name: (names.generalTimeName || "") })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for X.509 v3 certificate (RFC5280)
    //**************************************************************************************
    local.tbsCertificate =
    function()
    {
        //TBSCertificate  ::=  SEQUENCE  {
        //    version         [0]  EXPLICIT Version DEFAULT v1,
        //    serialNumber         CertificateSerialNumber,
        //    signature            AlgorithmIdentifier,
        //    issuer               Name,
        //    validity             Validity,
        //    subject              Name,
        //    subjectPublicKeyInfo SubjectPublicKeyInfo,
        //    issuerUniqueID  [1]  IMPLICIT UniqueIdentifier OPTIONAL,
        //                         -- If present, version MUST be v2 or v3
        //    subjectUniqueID [2]  IMPLICIT UniqueIdentifier OPTIONAL,
        //                         -- If present, version MUST be v2 or v3
        //    extensions      [3]  EXPLICIT Extensions OPTIONAL
        //    -- If present, version MUST be v3
        //}

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || "tbsCertificate"),
            value: [
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 0 // [0]
                    },
                value: [
                    new in_window.org.pkijs.asn1.INTEGER({ name: (names.tbsCertificate_version || "tbsCertificate.version") }) // EXPLICIT integer value
                ]
            }),
                new in_window.org.pkijs.asn1.INTEGER({ name: (names.tbsCertificate_serialNumber || "tbsCertificate.serialNumber") }),
                in_window.org.pkijs.schema.ALGORITHM_IDENTIFIER(names.signature || {
                    names: {
                        block_name: "tbsCertificate.signature"
                    }
                }),
                in_window.org.pkijs.schema.RDN(names.issuer || {
                    names: {
                        block_name: "tbsCertificate.issuer"
                    }
                }),
                new in_window.org.pkijs.asn1.SEQUENCE({
                    name: (names.tbsCertificate_validity || "tbsCertificate.validity"),
                    value: [
                        in_window.org.pkijs.schema.TIME(names.not_before || {
                            names: {
                                utcTimeName: "tbsCertificate.notBefore",
                                generalTimeName: "tbsCertificate.notBefore"
                            }
                        }),
                        in_window.org.pkijs.schema.TIME(names.not_after || {
                            names: {
                                utcTimeName: "tbsCertificate.notAfter",
                                generalTimeName: "tbsCertificate.notAfter"
                            }
                        })
                    ]
                }),
                in_window.org.pkijs.schema.RDN(names.subject || {
                    names: {
                        block_name: "tbsCertificate.subject"
                    }
                }),
                in_window.org.pkijs.schema.PUBLIC_KEY_INFO(names.subjectPublicKeyInfo || {
                    names: {
                        block_name: "tbsCertificate.subjectPublicKeyInfo"
                    }
                }),
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    name: (names.tbsCertificate_issuerUniqueID ||"tbsCertificate.issuerUniqueID"),
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 1 // [1]
                    }
                }), // IMPLICIT bistring value
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    name: (names.tbsCertificate_subjectUniqueID ||"tbsCertificate.subjectUniqueID"),
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 2 // [2]
                    }
                }), // IMPLICIT bistring value
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 3 // [3]
                    },
                    value: [in_window.org.pkijs.schema.EXTENSIONS(names.extensions || {
                        names: {
                            block_name: "tbsCertificate.extensions"
                        }
                    })]
                }) // EXPLICIT SEQUENCE value
            ]
        }));
    }
    //**************************************************************************************
    in_window.org.pkijs.schema.CERT =
    function()
    {
        //Certificate  ::=  SEQUENCE  {
        //    tbsCertificate       TBSCertificate,
        //    signatureAlgorithm   AlgorithmIdentifier,
        //    signatureValue       BIT STRING  }

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                local.tbsCertificate(names.tbsCertificate),
                in_window.org.pkijs.schema.ALGORITHM_IDENTIFIER(names.signatureAlgorithm || {
                    names: {
                        block_name: "signatureAlgorithm"
                    }
                }),
                new in_window.org.pkijs.asn1.BITSTRING({ name: (names.signatureValue || "signatureValue") })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for X.509 CRL (Certificate Revocation List)(RFC5280)  
    //**************************************************************************************
    local.tbsCertList =
    function()
    {
        //TBSCertList  ::=  SEQUENCE  {
        //    version                 Version OPTIONAL,
        //                                 -- if present, MUST be v2
        //    signature               AlgorithmIdentifier,
        //    issuer                  Name,
        //    thisUpdate              Time,
        //    nextUpdate              Time OPTIONAL,
        //    revokedCertificates     SEQUENCE OF SEQUENCE  {
        //        userCertificate         CertificateSerialNumber,
        //        revocationDate          Time,
        //        crlEntryExtensions      Extensions OPTIONAL
        //        -- if present, version MUST be v2
        //    }  OPTIONAL,
        //    crlExtensions           [0]  EXPLICIT Extensions OPTIONAL
        //    -- if present, version MUST be v2
        //}

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || "tbsCertList"),
            value: [
                        new in_window.org.pkijs.asn1.INTEGER({
                            optional: true,
                            name: (names.tbsCertList_version || "tbsCertList.version"),
                            value: 2
                        }), // EXPLICIT integer value (v2)
                        in_window.org.pkijs.schema.ALGORITHM_IDENTIFIER(names.signature || {
                            names: {
                                block_name: "tbsCertList.signature"
                            }
                        }),
                        in_window.org.pkijs.schema.RDN(names.issuer || {
                            names: {
                                block_name: "tbsCertList.issuer"
                            }
                        }),
                        in_window.org.pkijs.schema.TIME(names.tbsCertList_thisUpdate || {
                            names: {
                                utcTimeName: "tbsCertList.thisUpdate",
                                generalTimeName: "tbsCertList.thisUpdate"
                            }
                        }),
                        in_window.org.pkijs.schema.TIME(names.tbsCertList_thisUpdate || {
                            names: {
                                utcTimeName: "tbsCertList.nextUpdate",
                                generalTimeName: "tbsCertList.nextUpdate"
                            }
                        }, true),
                        new in_window.org.pkijs.asn1.SEQUENCE({
                            optional: true,
                            value: [
                                new in_window.org.pkijs.asn1.REPEATED({
                                    name: (names.tbsCertList_revokedCertificates || "tbsCertList.revokedCertificates"),
                                    value: new in_window.org.pkijs.asn1.SEQUENCE({
                                        value: [
                                            new in_window.org.pkijs.asn1.INTEGER(),
                                            in_window.org.pkijs.schema.TIME(),
                                            in_window.org.pkijs.schema.EXTENSIONS({}, true)
                                        ]
                                    })
                                })
                            ]
                        }),
                        new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                            optional: true,
                            id_block: {
                                tag_class: 3, // CONTEXT-SPECIFIC
                                tag_number: 0 // [0]
                            },
                            value: [in_window.org.pkijs.schema.EXTENSIONS(names.crlExtensions || {
                                names: {
                                    block_name: "tbsCertList.extensions"
                                }
                            })]
                        }) // EXPLICIT SEQUENCE value
                    ]
        }));
    }
    //**************************************************************************************
    in_window.org.pkijs.schema.CRL =
    function()
    {
        //CertificateList  ::=  SEQUENCE  {
        //    tbsCertList          TBSCertList,
        //    signatureAlgorithm   AlgorithmIdentifier,
        //    signatureValue       BIT STRING  }

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || "CertificateList"),
            value: [
                local.tbsCertList(arguments[0]),
                in_window.org.pkijs.schema.ALGORITHM_IDENTIFIER(names.signatureAlgorithm || {
                    names: {
                        block_name: "signatureAlgorithm"
                    }
                }),
                new in_window.org.pkijs.asn1.BITSTRING({ name: (names.signatureValue || "signatureValue") })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for PKCS#10 certificate request 
    //**************************************************************************************
    local.CertificationRequestInfo =
    function()
    {
        //CertificationRequestInfo ::= SEQUENCE {
        //    version       INTEGER { v1(0) } (v1,...),
        //    subject       Name,
        //    subjectPKInfo SubjectPublicKeyInfo{{ PKInfoAlgorithms }},
        //    attributes    [0] Attributes{{ CRIAttributes }}
        //}

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.CertificationRequestInfo || "CertificationRequestInfo"),
            value: [
                new in_window.org.pkijs.asn1.INTEGER({ name: (names.CertificationRequestInfo_version || "CertificationRequestInfo.version") }),
                new in_window.org.pkijs.schema.RDN(names.subject || {
                    names: {
                        block_name: "CertificationRequestInfo.subject"
                    }
                }),
                new in_window.org.pkijs.schema.PUBLIC_KEY_INFO({
                    names: {
                        block_name: "CertificationRequestInfo.subjectPublicKeyInfo"
                    }
                }),
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 0 // [0]
                    },
                    value: [
                        new in_window.org.pkijs.asn1.REPEATED({
                            optional: true, // Because OpenSSL makes wrong "attributes" field
                            name: (names.CertificationRequestInfo_attributes || "CertificationRequestInfo.attributes"),
                            value: in_window.org.pkijs.schema.ATTRIBUTE(names.attributes || {})
                        })
                    ]
                })
            ]
        }));
    }
    //**************************************************************************************
    in_window.org.pkijs.schema.PKCS10 =
    function()
    {
        //CertificationRequest ::= SEQUENCE {
        //    certificationRequestInfo CertificationRequestInfo,
        //    signatureAlgorithm       AlgorithmIdentifier{{ SignatureAlgorithms }},
        //    signature                BIT STRING
        //}

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: [
                local.CertificationRequestInfo(names.certificationRequestInfo || {}),
                new in_window.org.pkijs.asn1.SEQUENCE({
                    name: (names.signatureAlgorithm || "signatureAlgorithm"),
                    value: [
                        new in_window.org.pkijs.asn1.OID(),
                        new in_window.org.pkijs.asn1.ANY({ optional: true })
                    ]
                }),
                new in_window.org.pkijs.asn1.BITSTRING({ name: (names.signatureValue || "signatureValue") })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for PKCS#8 private key bag
    //**************************************************************************************
    in_window.org.pkijs.schema.PKCS8 =
    function()
    {
        //PrivateKeyInfo ::= SEQUENCE {
        //    version Version,
        //    privateKeyAlgorithm AlgorithmIdentifier {{PrivateKeyAlgorithms}},
        //    privateKey PrivateKey,
        //    attributes [0] Attributes OPTIONAL }
        //
        //Version ::= INTEGER {v1(0)} (v1,...)
        //
        //PrivateKey ::= OCTET STRING
        //
        //Attributes ::= SET OF Attribute

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: [
                new in_window.org.pkijs.asn1.INTEGER({ name: (names.version || "") }),
                in_window.org.pkijs.schema.ALGORITHM_IDENTIFIER(names.privateKeyAlgorithm || ""),
                new in_window.org.pkijs.asn1.OCTETSTRING({ name: (names.privateKey || "") }),
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 0 // [0]
                    },
                    value: [
                        new in_window.org.pkijs.asn1.REPEATED({
                            name: (names.attributes || ""),
                            value: in_window.org.pkijs.schema.ATTRIBUTE()
                        })
                    ]
                })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "GeneralName" type 
    //**************************************************************************************
    local.BuiltInStandardAttributes =
    function(optional_flag)
    {
        //BuiltInStandardAttributes ::= SEQUENCE {
        //    country-name                  CountryName OPTIONAL,
        //    administration-domain-name    AdministrationDomainName OPTIONAL,
        //    network-address           [0] IMPLICIT NetworkAddress OPTIONAL,
        //    terminal-identifier       [1] IMPLICIT TerminalIdentifier OPTIONAL,
        //    private-domain-name       [2] PrivateDomainName OPTIONAL,
        //    organization-name         [3] IMPLICIT OrganizationName OPTIONAL,
        //    numeric-user-identifier   [4] IMPLICIT NumericUserIdentifier OPTIONAL,
        //    personal-name             [5] IMPLICIT PersonalName OPTIONAL,
        //    organizational-unit-names [6] IMPLICIT OrganizationalUnitNames OPTIONAL }

        if(typeof optional_flag === "undefined")
            optional_flag = false;

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            optional: optional_flag,
            value: [
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    optional: true,
                    id_block: {
                        tag_class: 2, // APPLICATION-SPECIFIC
                        tag_number: 1 // [1]
                    },
                    name: (names.country_name || ""),
                    value: [
                        new in_window.org.pkijs.asn1.CHOICE({
                            value: [
                                new in_window.org.pkijs.asn1.NUMERICSTRING(),
                                new in_window.org.pkijs.asn1.PRINTABLESTRING()
                            ]
                        })
                    ]
                }),
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    optional: true,
                    id_block: {
                        tag_class: 2, // APPLICATION-SPECIFIC
                        tag_number: 2 // [2]
                    },
                    name: (names.administration_domain_name || ""),
                    value: [
                        new in_window.org.pkijs.asn1.CHOICE({
                            value: [
                                new in_window.org.pkijs.asn1.NUMERICSTRING(),
                                new in_window.org.pkijs.asn1.PRINTABLESTRING()
                            ]
                        })
                    ]
                }),
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 0 // [0]
                    },
                    name: (names.network_address || ""),
                    is_hex_only: true
                }),
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 1 // [1]
                    },
                    name: (names.terminal_identifier || ""),
                    is_hex_only: true
                }),
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 2 // [2]
                    },
                    name: (names.private_domain_name || ""),
                    value: [
                        new in_window.org.pkijs.asn1.CHOICE({
                            value: [
                                new in_window.org.pkijs.asn1.NUMERICSTRING(),
                                new in_window.org.pkijs.asn1.PRINTABLESTRING()
                            ]
                        })
                    ]
                }),
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 3 // [3]
                    },
                    name: (names.organization_name || ""),
                    is_hex_only: true
                }),
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    optional: true,
                    name: (names.numeric_user_identifier || ""),
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 4 // [4]
                    },
                    is_hex_only: true
                }),
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    optional: true,
                    name: (names.personal_name || ""),
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 5 // [5]
                    },
                    value: [
                        new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                            id_block: {
                                tag_class: 3, // CONTEXT-SPECIFIC
                                tag_number: 0 // [0]
                            },
                            is_hex_only: true
                        }),
                        new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                            optional: true,
                            id_block: {
                                tag_class: 3, // CONTEXT-SPECIFIC
                                tag_number: 1 // [1]
                            },
                            is_hex_only: true
                        }),
                        new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                            optional: true,
                            id_block: {
                                tag_class: 3, // CONTEXT-SPECIFIC
                                tag_number: 2 // [2]
                            },
                            is_hex_only: true
                        }),
                        new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                            optional: true,
                            id_block: {
                                tag_class: 3, // CONTEXT-SPECIFIC
                                tag_number: 3 // [3]
                            },
                            is_hex_only: true
                        })
                    ]
                }),
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    optional: true,
                    name: (names.organizational_unit_names || ""),
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 6 // [6]
                    },
                    value: [
                        new in_window.org.pkijs.asn1.REPEATED({
                            value: new in_window.org.pkijs.asn1.PRINTABLESTRING()
                        })
                    ]
                })
            ]
        }));
    }
    //**************************************************************************************
    local.BuiltInDomainDefinedAttributes =
    function(optional_flag)
    {
        if(typeof optional_flag === "undefined")
            optional_flag = false;

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            optional: optional_flag,
            value: [
                new in_window.org.pkijs.asn1.PRINTABLESTRING(),
                new in_window.org.pkijs.asn1.PRINTABLESTRING()
            ]
        }));
    }
    //**************************************************************************************
    local.ExtensionAttributes =
    function(optional_flag)
    {
        if(typeof optional_flag === "undefined")
            optional_flag = false;

        return (new in_window.org.pkijs.asn1.SET({
            optional: optional_flag,
            value: [
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 0 // [0]
                    },
                    is_hex_only: true
                }),
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 1 // [1]
                    },
                    value: [new in_window.org.pkijs.asn1.ANY()]
                })
            ]
        }));
    }
    //**************************************************************************************
    in_window.org.pkijs.schema.GENERAL_NAME =
    function()
    {
        /// <remarks>By passing "names" array as an argument you can name each element of "GENERAL NAME" choice</remarks>

        //GeneralName ::= CHOICE {
        //    otherName                       [0]     OtherName,
        //    rfc822Name                      [1]     IA5String,
        //    dNSName                         [2]     IA5String,
        //    x400Address                     [3]     ORAddress,
        //    directoryName                   [4]     Name,
        //    ediPartyName                    [5]     EDIPartyName,
        //    uniformResourceIdentifier       [6]     IA5String,
        //    iPAddress                       [7]     OCTET STRING,
        //    registeredID                    [8]     OBJECT IDENTIFIER }

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.CHOICE({
            value: [
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 0 // [0]
                    },
                    name: (names.block_name || ""),
                    value: [
                            new in_window.org.pkijs.asn1.OID(),
                            new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                                id_block: {
                                    tag_class: 3, // CONTEXT-SPECIFIC
                                    tag_number: 0 // [0]
                                },
                                value: [new in_window.org.pkijs.asn1.ANY()]
                            })
                    ]
                }),
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    name: (names.block_name || ""),
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 1 // [1]
                    }
                }),
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    name: (names.block_name || ""),
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 2 // [2]
                    }
                }),
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 3 // [3]
                    },
                    name: (names.block_name || ""),
                    value: [
                            local.BuiltInStandardAttributes(false),
                            local.BuiltInDomainDefinedAttributes(true),
                            local.ExtensionAttributes(true)
                    ]
                }),
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 4 // [4]
                    },
                    name: (names.block_name || ""),
                    value: [in_window.org.pkijs.schema.RDN(names.directoryName || {})]
                }),
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 5 // [5]
                    },
                    name: (names.block_name || ""),
                    value: [
                            new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                                optional: true,
                                id_block: {
                                    tag_class: 3, // CONTEXT-SPECIFIC
                                    tag_number: 0 // [0]
                                },
                                value: [
                                    new in_window.org.pkijs.asn1.CHOICE({
                                        value: [
                                            new in_window.org.pkijs.asn1.TELETEXSTRING(),
                                            new in_window.org.pkijs.asn1.PRINTABLESTRING(),
                                            new in_window.org.pkijs.asn1.UNIVERSALSTRING(),
                                            new in_window.org.pkijs.asn1.UTF8STRING(),
                                            new in_window.org.pkijs.asn1.BMPSTRING()
                                        ]
                                    })
                                ]
                            }),
                            new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                                id_block: {
                                    tag_class: 3, // CONTEXT-SPECIFIC
                                    tag_number: 1 // [1]
                                },
                                value: [
                                    new in_window.org.pkijs.asn1.CHOICE({
                                        value: [
                                            new in_window.org.pkijs.asn1.TELETEXSTRING(),
                                            new in_window.org.pkijs.asn1.PRINTABLESTRING(),
                                            new in_window.org.pkijs.asn1.UNIVERSALSTRING(),
                                            new in_window.org.pkijs.asn1.UTF8STRING(),
                                            new in_window.org.pkijs.asn1.BMPSTRING()
                                        ]
                                    })
                                ]
                            })
                    ]
                }),
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    name: (names.block_name || ""),
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 6 // [6]
                    }
                }),
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    name: (names.block_name || ""),
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 7 // [7]
                    }
                }),
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    name: (names.block_name || ""),
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 8 // [8]
                    }
                })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "AlgorithmIdentifier" type 
    //**************************************************************************************
    in_window.org.pkijs.schema.ALGORITHM_IDENTIFIER =
    function()
    {
        //AlgorithmIdentifier  ::=  SEQUENCE  {
        //    algorithm               OBJECT IDENTIFIER,
        //    parameters              ANY DEFINED BY algorithm OPTIONAL  }

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            optional: (names.optional || false),
            value: [
                new in_window.org.pkijs.asn1.OID({ name: (names.algorithmIdentifier || "") }),
                new in_window.org.pkijs.asn1.ANY({ name: (names.algorithmParams || ""), optional: true })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "RSAPublicKey" type (RFC3447)
    //**************************************************************************************
    in_window.org.pkijs.schema.x509.RSAPublicKey =
    function()
    {
        //RSAPublicKey ::= SEQUENCE {
        //    modulus           INTEGER,  -- n
        //    publicExponent    INTEGER   -- e
        //}

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.INTEGER({ name: (names.modulus || "") }),
                new in_window.org.pkijs.asn1.INTEGER({ name: (names.publicExponent || "") })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "OtherPrimeInfo" type (RFC3447) 
    //**************************************************************************************
    in_window.org.pkijs.schema.x509.OtherPrimeInfo =
    function()
    {
        //OtherPrimeInfo ::= SEQUENCE {
        //    prime             INTEGER,  -- ri
        //    exponent          INTEGER,  -- di
        //    coefficient       INTEGER   -- ti
        //}

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.INTEGER({ name: (names.prime || "") }),
                new in_window.org.pkijs.asn1.INTEGER({ name: (names.exponent || "") }),
                new in_window.org.pkijs.asn1.INTEGER({ name: (names.coefficient || "") })
    ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "RSAPrivateKey" type (RFC3447)
    //**************************************************************************************
    in_window.org.pkijs.schema.x509.RSAPrivateKey =
    function()
    {
        //RSAPrivateKey ::= SEQUENCE {
        //    version           Version,
        //    modulus           INTEGER,  -- n
        //    publicExponent    INTEGER,  -- e
        //    privateExponent   INTEGER,  -- d
        //    prime1            INTEGER,  -- p
        //    prime2            INTEGER,  -- q
        //    exponent1         INTEGER,  -- d mod (p-1)
        //    exponent2         INTEGER,  -- d mod (q-1)
        //    coefficient       INTEGER,  -- (inverse of q) mod p
        //    otherPrimeInfos   OtherPrimeInfos OPTIONAL
        //}
        //
        //OtherPrimeInfos ::= SEQUENCE SIZE(1..MAX) OF OtherPrimeInfo

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.INTEGER({ name: (names.version || "") }),
                new in_window.org.pkijs.asn1.INTEGER({ name: (names.modulus || "") }),
                new in_window.org.pkijs.asn1.INTEGER({ name: (names.publicExponent || "") }),
                new in_window.org.pkijs.asn1.INTEGER({ name: (names.privateExponent || "") }),
                new in_window.org.pkijs.asn1.INTEGER({ name: (names.prime1 || "") }),
                new in_window.org.pkijs.asn1.INTEGER({ name: (names.prime2 || "") }),
                new in_window.org.pkijs.asn1.INTEGER({ name: (names.exponent1 || "") }),
                new in_window.org.pkijs.asn1.INTEGER({ name: (names.exponent2 || "") }),
                new in_window.org.pkijs.asn1.INTEGER({ name: (names.coefficient || "") }),
                new in_window.org.pkijs.asn1.SEQUENCE({
                    optional: true,
                    value: [
                        new in_window.org.pkijs.asn1.REPEATED({
                            name: (names.otherPrimeInfos || ""),
                            value: in_window.org.pkijs.schema.x509.OtherPrimeInfo(names.otherPrimeInfo || {})
                        })
                    ]
                })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "RSASSA-PSS-params" type (RFC3447)
    //**************************************************************************************
    in_window.org.pkijs.schema.x509.RSASSA_PSS_params =
    function()
    {
        //RSASSA-PSS-params  ::=  SEQUENCE  {
        //    hashAlgorithm      [0] HashAlgorithm DEFAULT sha1Identifier,
        //    maskGenAlgorithm   [1] MaskGenAlgorithm DEFAULT mgf1SHA1Identifier,
        //    saltLength         [2] INTEGER DEFAULT 20,
        //    trailerField       [3] INTEGER DEFAULT 1  }

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 0 // [0]
                    },
                    optional: true,
                    value: [in_window.org.pkijs.schema.ALGORITHM_IDENTIFIER(names.hashAlgorithm || {})]
                }),
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 1 // [1]
                    },
                    optional: true,
                    value: [in_window.org.pkijs.schema.ALGORITHM_IDENTIFIER(names.maskGenAlgorithm || {})]
                }),
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 2 // [2]
                    },
                    optional: true,
                    value: [new in_window.org.pkijs.asn1.INTEGER({ name: (names.saltLength || "") })]
                }),
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 3 // [3]
                    },
                    optional: true,
                    value: [new in_window.org.pkijs.asn1.INTEGER({ name: (names.trailerField || "") })]
                }),
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "SubjectPublicKeyInfo" type 
    //**************************************************************************************
    in_window.org.pkijs.schema.PUBLIC_KEY_INFO =
    function()
    {
        //SubjectPublicKeyInfo  ::=  SEQUENCE  {
        //    algorithm            AlgorithmIdentifier,
        //    subjectPublicKey     BIT STRING  }

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                in_window.org.pkijs.schema.ALGORITHM_IDENTIFIER(names.algorithm || {}),
                new in_window.org.pkijs.asn1.BITSTRING({ name: (names.subjectPublicKey || "") })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "Attribute" type 
    //**************************************************************************************
    in_window.org.pkijs.schema.ATTRIBUTE =
    function()
    {
        // Attribute { ATTRIBUTE:IOSet } ::= SEQUENCE {
        //    type   ATTRIBUTE.&id({IOSet}),
        //    values SET SIZE(1..MAX) OF ATTRIBUTE.&Type({IOSet}{@type})
        //}

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.OID({ name: (names.type || "") }),
                new in_window.org.pkijs.asn1.SET({
                    name: (names.set_name || ""),
                    value: [
                        new in_window.org.pkijs.asn1.REPEATED({
                            name: (names.values || ""),
                            value: new in_window.org.pkijs.asn1.ANY()
                        })
                    ]
                })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "AttributeTypeAndValue" type 
    //**************************************************************************************
    in_window.org.pkijs.schema.ATTR_TYPE_AND_VALUE =
    function()
    {
        //AttributeTypeAndValue ::= SEQUENCE {
        //    type     AttributeType,
        //    value    AttributeValue }
        //
        //AttributeType ::= OBJECT IDENTIFIER
        //
        //AttributeValue ::= ANY -- DEFINED BY AttributeType

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.OID({ name: (names.type || "") }),
                new in_window.org.pkijs.asn1.ANY({ name: (names.value || "") })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "RelativeDistinguishedName" type 
    //**************************************************************************************
    in_window.org.pkijs.schema.RDN =
    function()
    {
        //RDNSequence ::= SEQUENCE OF RelativeDistinguishedName
        //
        //RelativeDistinguishedName ::=
        //SET SIZE (1..MAX) OF AttributeTypeAndValue

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.REPEATED({
                    name: (names.repeated_sequence || ""),
                    value: new in_window.org.pkijs.asn1.SET({
                        value: [
                            new in_window.org.pkijs.asn1.REPEATED({
                                name: (names.repeated_set || ""),
                                value: in_window.org.pkijs.schema.ATTR_TYPE_AND_VALUE(names.attr_type_and_value || {})
                            })
                        ]
                    })
                })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "Extension" type 
    //**************************************************************************************
    in_window.org.pkijs.schema.EXTENSION =
    function()
    {
        //Extension  ::=  SEQUENCE  {
        //    extnID      OBJECT IDENTIFIER,
        //    critical    BOOLEAN DEFAULT FALSE,
        //    extnValue   OCTET STRING
        //}

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.OID({ name: (names.extnID || "") }),
                new in_window.org.pkijs.asn1.BOOLEAN({
                    name: (names.critical || ""),
                    optional: true
                }),
                new in_window.org.pkijs.asn1.OCTETSTRING({ name: (names.extnValue || "") })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "Extensions" type (sequence of many Extension)
    //**************************************************************************************
    in_window.org.pkijs.schema.EXTENSIONS =
    function(input_names, input_optional)
    {
        //Extensions  ::=  SEQUENCE SIZE (1..MAX) OF Extension

        var names = in_window.org.pkijs.getNames(arguments[0]);
        var optional = input_optional || false;

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            optional: optional,
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.REPEATED({
                    name: (names.extensions || ""),
                    value: in_window.org.pkijs.schema.EXTENSION(names.extension || {})
                })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "AuthorityKeyIdentifier" type of extension 
    //**************************************************************************************
    in_window.org.pkijs.schema.x509.AuthorityKeyIdentifier =
    function()
    {
        // AuthorityKeyIdentifier OID ::= 2.5.29.35
        // 
        //AuthorityKeyIdentifier ::= SEQUENCE {
        //    keyIdentifier             [0] KeyIdentifier           OPTIONAL,
        //    authorityCertIssuer       [1] GeneralNames            OPTIONAL,
        //    authorityCertSerialNumber [2] CertificateSerialNumber OPTIONAL  }
        //
        //KeyIdentifier ::= OCTET STRING

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    name: (names.keyIdentifier || ""),
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 0 // [0]
                    }
                }),
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 1 // [1]
                    },
                    value: [
                            new in_window.org.pkijs.asn1.REPEATED({
                                name: (names.authorityCertIssuer || ""),
                                value: in_window.org.pkijs.schema.GENERAL_NAME()
                            })
                    ]
                }),
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    name: (names.authorityCertSerialNumber || ""),
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 2 // [2]
                    }
                })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "PrivateKeyUsagePeriod" type of extension 
    //**************************************************************************************
    in_window.org.pkijs.schema.x509.PrivateKeyUsagePeriod =
    function()
    {
        // PrivateKeyUsagePeriod OID ::= 2.5.29.16
        //
        //PrivateKeyUsagePeriod ::= SEQUENCE {
        //    notBefore       [0]     GeneralizedTime OPTIONAL,
        //    notAfter        [1]     GeneralizedTime OPTIONAL }
        //-- either notBefore or notAfter MUST be present

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    name: (names.notBefore || ""),
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 0 // [0]
                    }
                }),
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    name: (names.notAfter || ""),
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 1 // [1]
                    }
                })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "IssuerAltName" and "SubjectAltName" types of extension 
    //**************************************************************************************
    in_window.org.pkijs.schema.x509.AltName =
    function()
    {
        // SubjectAltName OID ::= 2.5.29.17
        // IssuerAltName OID ::= 2.5.29.18
        //
        // AltName ::= GeneralNames

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.REPEATED({
                    name: (names.altNames || ""),
                    value: in_window.org.pkijs.schema.GENERAL_NAME()
                })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "SubjectDirectoryAttributes" type of extension 
    //**************************************************************************************
    in_window.org.pkijs.schema.x509.SubjectDirectoryAttributes =
    function()
    {
        // SubjectDirectoryAttributes OID ::= 2.5.29.9
        //
        //SubjectDirectoryAttributes ::= SEQUENCE SIZE (1..MAX) OF Attribute

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.REPEATED({
                    name: (names.attributes || ""),
                    value: in_window.org.pkijs.schema.ATTRIBUTE()
                })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "GeneralSubtree" type 
    //**************************************************************************************
    in_window.org.pkijs.schema.x509.GeneralSubtree =
    function()
    {
        //GeneralSubtree ::= SEQUENCE {
        //    base                    GeneralName,
        //    minimum         [0]     BaseDistance DEFAULT 0,
        //    maximum         [1]     BaseDistance OPTIONAL }
        //
        //BaseDistance ::= INTEGER (0..MAX)

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                in_window.org.pkijs.schema.GENERAL_NAME(names.base || ""),
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 0 // [0]
                    },
                    value: [new in_window.org.pkijs.asn1.INTEGER({ name: (names.minimum || "") })]
                }),
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 1 // [1]
                    },
                    value: [new in_window.org.pkijs.asn1.INTEGER({ name: (names.maximum || "") })]
                })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "NameConstraints" type of extension 
    //**************************************************************************************
    in_window.org.pkijs.schema.x509.NameConstraints =
    function()
    {
        // NameConstraints OID ::= 2.5.29.30
        //
        //NameConstraints ::= SEQUENCE {
        //    permittedSubtrees       [0]     GeneralSubtrees OPTIONAL,
        //    excludedSubtrees        [1]     GeneralSubtrees OPTIONAL }

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 0 // [0]
                    },
                    value: [
                        new in_window.org.pkijs.asn1.REPEATED({
                            name: (names.permittedSubtrees || ""),
                            value: in_window.org.pkijs.schema.x509.GeneralSubtree()
                        })
                    ]
                }),
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 1 // [1]
                    },
                    value: [
                        new in_window.org.pkijs.asn1.REPEATED({
                            name: (names.excludedSubtrees || ""),
                            value: in_window.org.pkijs.schema.x509.GeneralSubtree()
                        })
                    ]
                })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "BasicConstraints" type of extension 
    //**************************************************************************************
    in_window.org.pkijs.schema.x509.BasicConstraints =
    function()
    {
        // BasicConstraints OID ::= 2.5.29.19
        //
        //BasicConstraints ::= SEQUENCE {
        //    cA                      BOOLEAN DEFAULT FALSE,
        //    pathLenConstraint       INTEGER (0..MAX) OPTIONAL }

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.BOOLEAN({
                    optional: true,
                    name: (names.cA || "")
                }),
                new in_window.org.pkijs.asn1.INTEGER({
                    optional: true,
                    name: (names.pathLenConstraint || "")
                })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "PolicyQualifierInfo" type 
    //**************************************************************************************
    in_window.org.pkijs.schema.x509.PolicyQualifierInfo =
    function()
    {
        //PolicyQualifierInfo ::= SEQUENCE {
        //    policyQualifierId  PolicyQualifierId,
        //    qualifier          ANY DEFINED BY policyQualifierId }
        //
        //id-qt          OBJECT IDENTIFIER ::=  { id-pkix 2 }
        //id-qt-cps      OBJECT IDENTIFIER ::=  { id-qt 1 }
        //id-qt-unotice  OBJECT IDENTIFIER ::=  { id-qt 2 }
        //
        //PolicyQualifierId ::= OBJECT IDENTIFIER ( id-qt-cps | id-qt-unotice )

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.OID({ name: (names.policyQualifierId || "") }),
                new in_window.org.pkijs.asn1.ANY({ name: (names.qualifier || "") })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "PolicyInformation" type 
    //**************************************************************************************
    in_window.org.pkijs.schema.x509.PolicyInformation =
    function()
    {
        //PolicyInformation ::= SEQUENCE {
        //    policyIdentifier   CertPolicyId,
        //    policyQualifiers   SEQUENCE SIZE (1..MAX) OF
        //    PolicyQualifierInfo OPTIONAL }
        //
        //CertPolicyId ::= OBJECT IDENTIFIER

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.OID({ name: (names.policyIdentifier || "") }),
                new in_window.org.pkijs.asn1.SEQUENCE({
                    optional: true,
                    value: [
                        new in_window.org.pkijs.asn1.REPEATED({
                            name: (names.policyQualifiers || ""),
                            value: in_window.org.pkijs.schema.x509.PolicyQualifierInfo()
                        })
                    ]
                })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "CertificatePolicies" type of extension 
    //**************************************************************************************
    in_window.org.pkijs.schema.x509.CertificatePolicies =
    function()
    {
        // CertificatePolicies OID ::= 2.5.29.32
        //
        //certificatePolicies ::= SEQUENCE SIZE (1..MAX) OF PolicyInformation

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.REPEATED({
                    name: (names.certificatePolicies || ""),
                    value: in_window.org.pkijs.schema.x509.PolicyInformation()
                })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "PolicyMapping" type
    //**************************************************************************************
    in_window.org.pkijs.schema.x509.PolicyMapping =
    function()
    {
        //PolicyMapping ::= SEQUENCE {
        //    issuerDomainPolicy      CertPolicyId,
        //    subjectDomainPolicy     CertPolicyId }

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.OID({ name: (names.issuerDomainPolicy || "") }),
                new in_window.org.pkijs.asn1.OID({ name: (names.subjectDomainPolicy || "") })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "PolicyMappings" type of extension 
    //**************************************************************************************
    in_window.org.pkijs.schema.x509.PolicyMappings =
    function()
    {
        // PolicyMappings OID ::= 2.5.29.33
        //
        //PolicyMappings ::= SEQUENCE SIZE (1..MAX) OF PolicyMapping

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.REPEATED({
                    name: (names.mappings || ""),
                    value: in_window.org.pkijs.schema.x509.PolicyMapping()
                })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "PolicyConstraints" type of extension 
    //**************************************************************************************
    in_window.org.pkijs.schema.x509.PolicyConstraints =
    function()
    {
        // PolicyMappings OID ::= 2.5.29.36
        //
        //PolicyConstraints ::= SEQUENCE {
        //    requireExplicitPolicy           [0] SkipCerts OPTIONAL,
        //    inhibitPolicyMapping            [1] SkipCerts OPTIONAL }
        //
        //SkipCerts ::= INTEGER (0..MAX)

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    name: (names.requireExplicitPolicy || ""),
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 0 // [0]
                    }
                }), // IMPLICIT integer value
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    name: (names.inhibitPolicyMapping || ""),
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 1 // [1]
                    }
                }) // IMPLICIT integer value
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "ExtKeyUsage" type of extension 
    //**************************************************************************************
    in_window.org.pkijs.schema.x509.ExtKeyUsage =
    function()
    {
        // ExtKeyUsage OID ::= 2.5.29.37
        //
        // ExtKeyUsage ::= SEQUENCE SIZE (1..MAX) OF KeyPurposeId

        // KeyPurposeId ::= OBJECT IDENTIFIER

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.REPEATED({
                    name: (names.keyPurposes || ""),
                    value: new in_window.org.pkijs.asn1.OID()
                })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "DistributionPoint" type
    //**************************************************************************************
    in_window.org.pkijs.schema.x509.DistributionPoint =
    function()
    {
        //DistributionPoint ::= SEQUENCE {
        //    distributionPoint       [0]     DistributionPointName OPTIONAL,
        //    reasons                 [1]     ReasonFlags OPTIONAL,
        //    cRLIssuer               [2]     GeneralNames OPTIONAL }
        //
        //DistributionPointName ::= CHOICE {
        //    fullName                [0]     GeneralNames,
        //    nameRelativeToCRLIssuer [1]     RelativeDistinguishedName }
        //
        //ReasonFlags ::= BIT STRING {
        //    unused                  (0),
        //    keyCompromise           (1),
        //    cACompromise            (2),
        //    affiliationChanged      (3),
        //    superseded              (4),
        //    cessationOfOperation    (5),
        //    certificateHold         (6),
        //    privilegeWithdrawn      (7),
        //    aACompromise            (8) }

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 0 // [0]
                    },
                    value: [
                        new in_window.org.pkijs.asn1.CHOICE({
                            value: [
                                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                                    name: (names.distributionPoint || ""),
                                    optional: true,
                                    id_block: {
                                        tag_class: 3, // CONTEXT-SPECIFIC
                                        tag_number: 0 // [0]
                                    },
                                    value: [
                                        new in_window.org.pkijs.asn1.REPEATED({
                                            name: (names.distributionPoint_names || ""),
                                            value: in_window.org.pkijs.schema.GENERAL_NAME()
                                        })
                                    ]
                                }),
                                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                                    name: (names.distributionPoint || ""),
                                    optional: true,
                                    id_block: {
                                        tag_class: 3, // CONTEXT-SPECIFIC
                                        tag_number: 1 // [1]
                                    },
                                    value: in_window.org.pkijs.schema.RDN().value_block.value
                                })
                            ]
                        })
                    ]
                }),
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    name: (names.reasons || ""),
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 1 // [1]
                    }
                }), // IMPLICIT bitstring value
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    name: (names.cRLIssuer || ""),
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 2 // [2]
                    },
                    value: [
                        new in_window.org.pkijs.asn1.REPEATED({
                            name: (names.cRLIssuer_names || ""),
                            value: in_window.org.pkijs.schema.GENERAL_NAME()
                        })
                    ]
                }) // IMPLICIT bitstring value
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "CRLDistributionPoints" type of extension 
    //**************************************************************************************
    in_window.org.pkijs.schema.x509.CRLDistributionPoints =
    function()
    {
        // CRLDistributionPoints OID ::= 2.5.29.31
        //
        //CRLDistributionPoints ::= SEQUENCE SIZE (1..MAX) OF DistributionPoint

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.REPEATED({
                    name: (names.distributionPoints || ""),
                    value: in_window.org.pkijs.schema.x509.DistributionPoint()
                })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "AccessDescription" type
    //**************************************************************************************
    in_window.org.pkijs.schema.x509.AccessDescription =
    function()
    {
        //AccessDescription  ::=  SEQUENCE {
        //    accessMethod          OBJECT IDENTIFIER,
        //    accessLocation        GeneralName  }

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.OID({ name: (names.accessMethod || "") }),
                in_window.org.pkijs.schema.GENERAL_NAME(names.accessLocation || "")
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "AuthorityInfoAccess" and "SubjectInfoAccess" types of extension 
    //**************************************************************************************
    in_window.org.pkijs.schema.x509.InfoAccess =
    function()
    {
        // AuthorityInfoAccess OID ::= 1.3.6.1.5.5.7.1.1
        // SubjectInfoAccess OID ::= 1.3.6.1.5.5.7.1.11
        //
        //AuthorityInfoAccessSyntax  ::=
        //SEQUENCE SIZE (1..MAX) OF AccessDescription

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.REPEATED({
                    name: (names.accessDescriptions || ""),
                    value: in_window.org.pkijs.schema.x509.AccessDescription()
                })
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region ASN.1 schema definition for "IssuingDistributionPoint" type of extension 
    //**************************************************************************************
    in_window.org.pkijs.schema.x509.IssuingDistributionPoint =
    function()
    {
        // IssuingDistributionPoint OID ::= 2.5.29.28
        //
        //IssuingDistributionPoint ::= SEQUENCE {
        //    distributionPoint          [0] DistributionPointName OPTIONAL,
        //    onlyContainsUserCerts      [1] BOOLEAN DEFAULT FALSE,
        //    onlyContainsCACerts        [2] BOOLEAN DEFAULT FALSE,
        //    onlySomeReasons            [3] ReasonFlags OPTIONAL,
        //    indirectCRL                [4] BOOLEAN DEFAULT FALSE,
        //    onlyContainsAttributeCerts [5] BOOLEAN DEFAULT FALSE }
        //
        //ReasonFlags ::= BIT STRING {
        //    unused                  (0),
        //    keyCompromise           (1),
        //    cACompromise            (2),
        //    affiliationChanged      (3),
        //    superseded              (4),
        //    cessationOfOperation    (5),
        //    certificateHold         (6),
        //    privilegeWithdrawn      (7),
        //    aACompromise            (8) }

        var names = in_window.org.pkijs.getNames(arguments[0]);

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            name: (names.block_name || ""),
            value: [
                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 0 // [0]
                    },
                    value: [
                        new in_window.org.pkijs.asn1.CHOICE({
                            value: [
                                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                                    name: (names.distributionPoint || ""),
                                    id_block: {
                                        tag_class: 3, // CONTEXT-SPECIFIC
                                        tag_number: 0 // [0]
                                    },
                                    value: [
                                        new in_window.org.pkijs.asn1.REPEATED({
                                            name: (names.distributionPoint_names || ""),
                                            value: in_window.org.pkijs.schema.GENERAL_NAME()
                                        })
                                    ]
                                }),
                                new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                                    name: (names.distributionPoint || ""),
                                    id_block: {
                                        tag_class: 3, // CONTEXT-SPECIFIC
                                        tag_number: 1 // [1]
                                    },
                                    value: in_window.org.pkijs.schema.RDN().value_block.value
                                })
                            ]
                        })
                    ]
                }),
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    name: (names.onlyContainsUserCerts || ""),
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 1 // [1]
                    }
                }), // IMPLICIT boolean value
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    name: (names.onlyContainsCACerts || ""),
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 2 // [2]
                    }
                }), // IMPLICIT boolean value
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    name: (names.onlySomeReasons || ""),
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 3 // [3]
                    }
                }), // IMPLICIT bitstring value
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    name: (names.indirectCRL || ""),
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 4 // [4]
                    }
                }), // IMPLICIT boolean value
                new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                    name: (names.onlyContainsAttributeCerts || ""),
                    optional: true,
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 5 // [5]
                    }
                }) // IMPLICIT boolean value
            ]
        }));
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
}
)(typeof exports !== "undefined" ? exports : window);

//third_party/javascript/pkijs/x509_simpl.js
/**
 * @license
 * Copyright (c) 2014, GMO GlobalSign
 * Copyright (c) 2015, Peculiar Ventures
 * All rights reserved.
 *
 * Author 2014-2015, Yury Strozhevsky <www.strozhevsky.com>.
 *
 * Redistribution and use in source and binary forms, with or without modification, 
 * are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, 
 *    this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice, 
 *    this list of conditions and the following disclaimer in the documentation 
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors 
 *    may be used to endorse or promote products derived from this software without 
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND 
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED 
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. 
 * IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, 
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT 
 * NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR 
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, 
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY 
 * OF SUCH DAMAGE. 
 *
 */
(
function(in_window)
{
    //**************************************************************************************
    // #region Declaration of global variables 
    //**************************************************************************************
    // #region "org" namespace 
    if(typeof in_window.org === "undefined")
        in_window.org = {};
    else
    {
        if(typeof in_window.org !== "object")
            throw new Error("Name org already exists and it's not an object");
    }
    // #endregion 

    // #region "org.pkijs" namespace 
    if(typeof in_window.org.pkijs === "undefined")
        in_window.org.pkijs = {};
    else
    {
        if(typeof in_window.org.pkijs !== "object")
            throw new Error("Name org.pkijs already exists and it's not an object" + " but " + (typeof in_window.org.pkijs));
    }
    // #endregion 

    // #region "org.pkijs.simpl" namespace 
    if(typeof in_window.org.pkijs.simpl === "undefined")
        in_window.org.pkijs.simpl = {};
    else
    {
        if(typeof in_window.org.pkijs.simpl !== "object")
            throw new Error("Name org.pkijs.simpl already exists and it's not an object" + " but " + (typeof in_window.org.pkijs.simpl));
    }
    // #endregion 

    // #region "org.pkijs.simpl.x509" namespace 
    if(typeof in_window.org.pkijs.simpl.x509 === "undefined")
        in_window.org.pkijs.simpl.x509 = {};
    else
    {
        if(typeof in_window.org.pkijs.simpl.x509 !== "object")
            throw new Error("Name org.pkijs.simpl.x509 already exists and it's not an object" + " but " + (typeof in_window.org.pkijs.simpl.x509));
    }
    // #endregion 

    // #region "local" namespace 
    var local = {};
    // #endregion   
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "Time" type
    //**************************************************************************************
    in_window.org.pkijs.simpl.TIME =
    function()
    {
        // #region Internal properties of the object 
        this.type = 0; // 0 - UTCTime; 1 - GeneralizedTime; 2 - empty value
        this.value = new Date(0, 0, 0);
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.TIME.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.type = (arguments[0].type || 0);
                this.value = (arguments[0].value || (new Date(0, 0, 0)));
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.TIME.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.TIME({
                names: {
                    utcTimeName: "utcTimeName",
                    generalTimeName: "generalTimeName"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for TIME");
        // #endregion 

        // #region Get internal properties from parsed schema 
        if("utcTimeName" in asn1.result)
        {
            this.type = 0;
            this.value = asn1.result.utcTimeName.toDate();
        }
        if("generalTimeName" in asn1.result)
        {
            this.type = 1;
            this.value = asn1.result.generalTimeName.toDate();
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.TIME.prototype.toSchema =
    function()
    {
        // #region Construct and return new ASN.1 schema for this object 
        var result = {};

        if(this.type === 0)
            result = new in_window.org.pkijs.asn1.UTCTIME({ value_date: this.value });
        if(this.type === 1)
            result = new in_window.org.pkijs.asn1.GENERALIZEDTIME({ value_date: this.value });

        return result;
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.TIME.prototype.toJSON =
    function()
    {
        return {
            type: this.type,
            value: this.value
        };
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "GeneralName" type 
    //**************************************************************************************
    in_window.org.pkijs.simpl.GENERAL_NAME =
    function()
    {
        // #region Internal properties of the object 
        this.NameType = 9; // Name type - from a tagged value (0 for "otherName", 1 for "rfc822Name" etc.)
        this.Name = {};
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.GENERAL_NAME.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.NameType = arguments[0].NameType || 9;
                this.Name = arguments[0].Name || {};
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.GENERAL_NAME.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.GENERAL_NAME({
                names: {
                    block_name: "block_name",
                    otherName: "otherName",
                    rfc822Name: "rfc822Name",
                    dNSName: "dNSName",
                    x400Address: "x400Address",
                    directoryName: {
                            names: {
                                block_name: "directoryName"
                            }
                        },
                    ediPartyName: "ediPartyName",
                    uniformResourceIdentifier: "uniformResourceIdentifier",
                    iPAddress: "iPAddress",
                    registeredID: "registeredID"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for GENERAL_NAME");
        // #endregion 

        // #region Get internal properties from parsed schema
        this.NameType = asn1.result["block_name"].id_block.tag_number;

        switch(this.NameType)
        {
            case 0: // otherName
                this.Name = asn1.result["block_name"];
                break;
            case 1: // rfc822Name + dNSName + uniformResourceIdentifier
            case 2:
            case 6:
                {
                    var value = asn1.result["block_name"];

                    value.id_block.tag_class = 1; // UNIVERSAL
                    value.id_block.tag_number = 22; // IA5STRING

                    var value_ber = value.toBER(false);

                    this.Name = in_window.org.pkijs.fromBER(value_ber).result.value_block.value;
                }
                break;
            case 3: // x400Address
                this.Name = asn1.result["block_name"];
                break;
            case 4: // directoryName
                this.Name = new in_window.org.pkijs.simpl.RDN({ schema: asn1.result["directoryName"] });
                break;
            case 5: // ediPartyName
                this.Name = asn1.result["ediPartyName"];
                break;
            case 7: // iPAddress
                this.Name = new in_window.org.pkijs.asn1.OCTETSTRING({ value_hex: asn1.result["block_name"].value_block.value_hex });
                break;
            case 8: // registeredID
                {
                    var value = asn1.result["block_name"];

                    value.id_block.tag_class = 1; // UNIVERSAL
                    value.id_block.tag_number = 6; // OID

                    var value_ber = value.toBER(false);

                    this.Name = in_window.org.pkijs.fromBER(value_ber).result.value_block.toString(); // Getting a string representation of the OID
                }
                break;
            default:;
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.GENERAL_NAME.prototype.toSchema =
    function(schema)
    {
        // #region Construct and return new ASN.1 schema for this object
        switch(this.NameType)
        {
            case 0:
            case 3:
            case 5:
                return new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: this.NameType
                    },
                    value: [
                        this.Name
                    ]
                });

                break;
            case 1:
            case 2:
            case 6:
                {
                    var value = new in_window.org.pkijs.asn1.IA5STRING({ value: this.Name });

                    value.id_block.tag_class = 3;
                    value.id_block.tag_number = this.NameType;

                    return value;
                }
                break;
            case 4:
                return new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 4
                    },
                    value: [this.Name.toSchema()]
                });
                break;
            case 7:
                {
                    var value = this.Name;

                    value.id_block.tag_class = 3;
                    value.id_block.tag_number = this.NameType;

                    return value;
                }
                break;
            case 8:
                {
                    var value = new in_window.org.pkijs.asn1.OID({ value: this.Name });

                    value.id_block.tag_class = 3;
                    value.id_block.tag_number = this.NameType;

                    return value;
                }
                break;
            default:
                return in_window.org.pkijs.schema.GENERAL_NAME();
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.GENERAL_NAME.prototype.toJSON =
    function()
    {
        var _object = {
            NameType: this.NameType
        };

        if((typeof this.Name) === "string")
            _object.Name = this.Name;
        else
            _object.Name = this.Name.toJSON();

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "GeneralNames" type 
    //**************************************************************************************
    in_window.org.pkijs.simpl.GENERAL_NAMES =
    function()
    {
        // #region Internal properties of the object 
        this.names = new Array(); // Array of "org.pkijs.simpl.GENERAL_NAME"
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.GENERAL_NAMES.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.names = arguments[0].names || new Array(); // Array of "org.pkijs.simpl.GENERAL_NAME"
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.GENERAL_NAMES.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            new in_window.org.pkijs.asn1.SEQUENCE({
                value: [
                    new in_window.org.pkijs.asn1.REPEATED({
                        name: "names",
                        value: in_window.org.pkijs.schema.GENERAL_NAME()
                    })
                ]
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for GENERAL_NAMES");
        // #endregion 

        // #region Get internal properties from parsed schema
        var n = asn1.result["names"];

        for(var i = 0; i < n.length; i++)
            this.names.push(new in_window.org.pkijs.simpl.GENERAL_NAME({ schema: n[i] }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.GENERAL_NAMES.prototype.toSchema =
    function(schema)
    {
        // #region Construct and return new ASN.1 schema for this object
        var output_array = new Array();

        for(var i = 0; i < this.names.length; i++)
            output_array.push(this.names[i].toSchema());

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.GENERAL_NAMES.prototype.toJSON =
    function()
    {
        var _names = new Array();

        for(var i = 0; i < this.names.length; i++)
            _names.push(this.names[i].toJSON());

        return {
            names: _names
        };
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "AlgorithmIdentifier" type 
    //**************************************************************************************
    in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER =
    function()
    {
        // #region Internal properties of the object 
        this.algorithm_id = "";
        // OPTIONAL this.algorithm_params = new in_window.org.pkijs.asn1.NULL();
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.algorithm_id = arguments[0].algorithm_id || "";
                if("algorithm_params" in arguments[0])
                    this.algorithm_params = arguments[0].algorithm_params;
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.ALGORITHM_IDENTIFIER({ 
                names: {
                    algorithmIdentifier: "algorithm",
                    algorithmParams: "params"
                }
                })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for ALGORITHM_IDENTIFIER");
        // #endregion 

        // #region Get internal properties from parsed schema 
        this.algorithm_id = asn1.result.algorithm.value_block.toString();
        if("params" in asn1.result)
            this.algorithm_params = asn1.result.params;
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER.prototype.toSchema =
    function()
    {
        // #region Create array for output sequence 
        var output_array = new Array();

        output_array.push(new in_window.org.pkijs.asn1.OID({ value: this.algorithm_id }));
        if("algorithm_params" in this)
            output_array.push(this.algorithm_params);
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER.prototype.getCommonName =
    function()
    {
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER.prototype.toJSON =
    function()
    {
        var _object = {
            algorithm_id: this.algorithm_id
        };

        if("algorithm_params" in this)
            _object.algorithm_params = this.algorithm_params.toJSON();

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "RSAPublicKey" type (RFC3447)
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.RSAPublicKey =
    function()
    {
        // #region Internal properties of the object 
        this.modulus = new in_window.org.pkijs.asn1.INTEGER();
        this.publicExponent = new in_window.org.pkijs.asn1.INTEGER();
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.x509.RSAPublicKey.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.modulus = arguments[0].modulus || new in_window.org.pkijs.asn1.INTEGER();
                this.publicExponent = arguments[0].publicExponent || new in_window.org.pkijs.asn1.INTEGER();
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.RSAPublicKey.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.x509.RSAPublicKey({
                names: {
                    modulus: "modulus",
                    publicExponent: "publicExponent"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for RSAPublicKey");
        // #endregion 

        // #region Get internal properties from parsed schema 
        this.modulus = asn1.result["modulus"];
        this.publicExponent = asn1.result["publicExponent"];
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.RSAPublicKey.prototype.toSchema =
    function()
    {
        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: [
                this.modulus,
                this.publicExponent
            ]
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.RSAPublicKey.prototype.toJSON =
    function()
    {
        return {
            modulus: this.modulus.toJSON(),
            publicExponent: this.publicExponent.toJSON()
        };
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "OtherPrimeInfo" type (RFC3447)
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.OtherPrimeInfo =
    function()
    {
        // #region Internal properties of the object 
        this.prime = new in_window.org.pkijs.asn1.INTEGER();
        this.exponent = new in_window.org.pkijs.asn1.INTEGER();
        this.coefficient = new in_window.org.pkijs.asn1.INTEGER();
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.x509.OtherPrimeInfo.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.prime = arguments[0].prime || new in_window.org.pkijs.asn1.INTEGER();
                this.exponent = arguments[0].exponent || new in_window.org.pkijs.asn1.INTEGER();
                this.coefficient = arguments[0].coefficient || new in_window.org.pkijs.asn1.INTEGER();
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.OtherPrimeInfo.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.x509.OtherPrimeInfo({
                names: {
                    prime: "prime",
                    exponent: "exponent",
                    coefficient: "coefficient"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for OtherPrimeInfo");
        // #endregion 

        // #region Get internal properties from parsed schema 
        this.prime = asn1.result["prime"];
        this.exponent = asn1.result["exponent"];
        this.coefficient = asn1.result["coefficient"];
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.OtherPrimeInfo.prototype.toSchema =
    function()
    {
        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: [
                this.prime,
                this.exponent,
                this.coefficient
            ]
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.OtherPrimeInfo.prototype.toJSON =
    function()
    {
        return {
            prime: this.prime.toJSON(),
            exponent: this.exponent.toJSON(),
            coefficient: this.coefficient.toJSON()
        };
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "RSAPrivateKey" type (RFC3447)
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.RSAPrivateKey =
    function()
    {
        // #region Internal properties of the object 
        this.version = 0;
        this.modulus = new in_window.org.pkijs.asn1.INTEGER();
        this.publicExponent = new in_window.org.pkijs.asn1.INTEGER();
        this.privateExponent = new in_window.org.pkijs.asn1.INTEGER();
        this.prime1 = new in_window.org.pkijs.asn1.INTEGER();
        this.prime2 = new in_window.org.pkijs.asn1.INTEGER();
        this.exponent1 = new in_window.org.pkijs.asn1.INTEGER();
        this.exponent2 = new in_window.org.pkijs.asn1.INTEGER();
        this.coefficient = new in_window.org.pkijs.asn1.INTEGER();
        // OPTIONAL this.otherPrimeInfos = new Array(); // Array of "OtherPrimeInfo"
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.x509.RSAPrivateKey.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.version = arguments[0].version || 0;
                this.modulus = arguments[0].modulus || new in_window.org.pkijs.asn1.INTEGER();
                this.publicExponent = arguments[0].publicExponent || new in_window.org.pkijs.asn1.INTEGER();
                this.privateExponent = arguments[0].privateExponent || new in_window.org.pkijs.asn1.INTEGER();
                this.prime1 = arguments[0].prime1 || new in_window.org.pkijs.asn1.INTEGER();
                this.prime2 = arguments[0].prime2 || new in_window.org.pkijs.asn1.INTEGER();
                this.exponent1 = arguments[0].exponent1 || new in_window.org.pkijs.asn1.INTEGER();
                this.exponent2 = arguments[0].exponent2 || new in_window.org.pkijs.asn1.INTEGER();
                this.coefficient = arguments[0].coefficient || new in_window.org.pkijs.asn1.INTEGER();
                if("otherPrimeInfos" in arguments[0])
                    this.otherPrimeInfos = arguments[0].otherPrimeInfos || new Array();
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.RSAPrivateKey.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.x509.RSAPrivateKey({
                names: {
                    version: "version",
                    modulus: "modulus",
                    publicExponent: "publicExponent",
                    privateExponent: "privateExponent",
                    prime1: "prime1",
                    prime2: "prime2",
                    exponent1: "exponent1",
                    exponent2: "exponent2",
                    coefficient: "coefficient",
                    otherPrimeInfos: "otherPrimeInfos"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for RSAPrivateKey");
        // #endregion 

        // #region Get internal properties from parsed schema 
        this.version = asn1.result["version"].value_block.value_dec;
        this.modulus = asn1.result["modulus"];
        this.publicExponent = asn1.result["publicExponent"];
        this.privateExponent = asn1.result["privateExponent"];
        this.prime1 = asn1.result["prime1"];
        this.prime2 = asn1.result["prime2"];
        this.exponent1 = asn1.result["exponent1"];
        this.exponent2 = asn1.result["exponent2"];
        this.coefficient = asn1.result["coefficient"];

        if("otherPrimeInfos" in asn1.result)
        {
            var otherPrimeInfos_array = asn1.result["otherPrimeInfos"];

            for(var i = 0; i < otherPrimeInfos_array.length; i++)
                this.otherPrimeInfos.push(new in_window.org.pkijs.simpl.x509.OtherPrimeInfo({ schema: otherPrimeInfos_array[i] }));
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.RSAPrivateKey.prototype.toSchema =
    function()
    {
        // #region Create array for output sequence 
        var output_array = new Array();

        output_array.push(new in_window.org.pkijs.asn1.INTEGER({ value: this.version }));
        output_array.push(this.modulus);
        output_array.push(this.publicExponent);
        output_array.push(this.privateExponent);
        output_array.push(this.prime1);
        output_array.push(this.prime2);
        output_array.push(this.exponent1);
        output_array.push(this.exponent2);
        output_array.push(this.coefficient);

        if("otherPrimeInfos" in this)
        {
            var otherPrimeInfos_array = new Array();

            for(var i = 0; i < this.otherPrimeInfos.length; i++)
                otherPrimeInfos_array.push(this.otherPrimeInfos[i].toSchema());

            output_array.push(new in_window.org.pkijs.asn1.SEQUENCE({ value: otherPrimeInfos_array }));
        }
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.RSAPrivateKey.prototype.toJSON =
    function()
    {
        var _object = {
            version: this.version,
            modulus: this.modulus.toJSON(),
            publicExponent: this.publicExponent.toJSON(),
            privateExponent: this.privateExponent.toJSON(),
            prime1: this.prime1.toJSON(),
            prime2: this.prime2.toJSON(),
            exponent1: this.exponent1.toJSON(),
            exponent2: this.exponent2.toJSON(),
            coefficient: this.coefficient.toJSON(),
        };

        if("otherPrimeInfos" in this)
        {
            _object.otherPrimeInfos = new Array();

            for(var i = 0; i < this.otherPrimeInfos.length; i++)
                _object.otherPrimeInfos.push(this.otherPrimeInfos[i].toJSON());
        }

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "RSASSA_PSS_params" type (RFC3447)
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.RSASSA_PSS_params =
    function()
    {
        // #region Internal properties of the object 
        // OPTIONAL this.hashAlgorithm = new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER();
        // OPTIONAL this.maskGenAlgorithm = new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER();
        // OPTIONAL this.saltLength = 20; // new in_window.org.pkijs.asn1.INTEGER();
        // OPTIONAL this.trailerField = 1; // new in_window.org.pkijs.asn1.INTEGER();
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.x509.RSASSA_PSS_params.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                if("hashAlgorithm" in arguments[0])
                    this.hashAlgorithm = arguments[0].hashAlgorithm;

                if("maskGenAlgorithm" in arguments[0])
                    this.maskGenAlgorithm = arguments[0].maskGenAlgorithm;

                if("saltLength" in arguments[0])
                    this.saltLength = arguments[0].saltLength;

                if("trailerField" in arguments[0])
                    this.trailerField = arguments[0].trailerField;
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.RSASSA_PSS_params.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.x509.RSASSA_PSS_params({
                names: {
                    hashAlgorithm: {
                        names: {
                            block_name: "hashAlgorithm"
                        }
                    },
                    maskGenAlgorithm: {
                        names: {
                            block_name: "maskGenAlgorithm"
                        }
                    },
                    saltLength: "saltLength",
                    trailerField: "trailerField"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for RSASSA_PSS_params");
        // #endregion 

        // #region Get internal properties from parsed schema 
        if("hashAlgorithm" in asn1.result)
            this.hashAlgorithm = new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER({ schema: asn1.result["hashAlgorithm"] });

        if("maskGenAlgorithm" in asn1.result)
            this.maskGenAlgorithm = new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER({ schema: asn1.result["maskGenAlgorithm"] });

        if("saltLength" in asn1.result)
            this.saltLength = asn1.result["saltLength"].value_block.value_dec;

        if("trailerField" in asn1.result)
            this.trailerField = asn1.result["trailerField"].value_block.value_dec;
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.RSASSA_PSS_params.prototype.toSchema =
    function()
    {
        // #region Create array for output sequence 
        var output_array = new Array();

        if("hashAlgorithm" in this)
            output_array.push(new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 0 // [0]
                },
                value: [this.hashAlgorithm.toSchema()]
            }));

        if("maskGenAlgorithm" in this)
            output_array.push(new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 1 // [1]
                },
                value: [this.maskGenAlgorithm.toSchema()]
            }));

        if("saltLength" in this)
            output_array.push(new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 2 // [2]
                },
                value: [new in_window.org.pkijs.asn1.INTEGER({ value: this.saltLength })]
            }));

        if("trailerField" in this)
            output_array.push(new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 3 // [3]
                },
                value: [new in_window.org.pkijs.asn1.INTEGER({ value: this.trailerField })]
            }));
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.RSASSA_PSS_params.prototype.toJSON =
    function()
    {
        var _object = {};

        if("hashAlgorithm" in this)
            _object.hashAlgorithm = this.hashAlgorithm.toJSON();

        if("maskGenAlgorithm" in this)
            _object.maskGenAlgorithm = this.maskGenAlgorithm.toJSON();

        if("saltLength" in this)
            _object.saltLength = this.saltLength.toJSON();

        if("trailerField" in this)
            _object.trailerField = this.trailerField.toJSON();

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "SubjectPublicKeyInfo" type 
    //**************************************************************************************
    in_window.org.pkijs.simpl.PUBLIC_KEY_INFO =
    function()
    {
        // #region Internal properties of the object 
        this.algorithm = new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER();
        this.subjectPublicKey = new in_window.org.pkijs.asn1.BITSTRING();
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.PUBLIC_KEY_INFO.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.algorithm = (arguments[0].algorithm || (new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER()));
                this.subjectPublicKey = (arguments[0].subjectPublicKey || (new in_window.org.pkijs.asn1.BITSTRING()));
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.PUBLIC_KEY_INFO.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.PUBLIC_KEY_INFO({
                names: {
                    algorithm: {
                        names: {
                            block_name: "algorithm"
                        }
                    },
                    subjectPublicKey: "subjectPublicKey"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for PUBLIC_KEY_INFO");
        // #endregion 

        // #region Get internal properties from parsed schema 
        this.algorithm = new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER({ schema: asn1.result.algorithm });
        this.subjectPublicKey = asn1.result.subjectPublicKey;
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.PUBLIC_KEY_INFO.prototype.toSchema =
    function()
    {
        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: [
                this.algorithm.toSchema(),
                this.subjectPublicKey
            ]
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.PUBLIC_KEY_INFO.prototype.importKey =
    function(publicKey)
    {
        /// <param name="publicKey" type="Key">Public key to work with</param>

        // #region Initial variables 
        var sequence = Promise.resolve();
        var _this = this;
        // #endregion   

        // #region Initial check 
        if(typeof publicKey === "undefined")
            return new Promise(function(resolve, reject) { reject("Need to provide publicKey input parameter"); });
        // #endregion 

        // #region Get a "crypto" extension 
        var crypto = in_window.org.pkijs.getCrypto();
        if(typeof crypto == "undefined")
            return new Promise(function(resolve, reject) { reject("Unable to create WebCrypto object"); });
        // #endregion 

        // #region Export public key 
        sequence = sequence.then(
            function()
            {
                return crypto.exportKey("spki", publicKey);
            }
            );
        // #endregion 

        // #region Initialize internal variables by parsing exported value
        sequence = sequence.then(
            function(exportedKey)
            {
                var asn1 = in_window.org.pkijs.fromBER(exportedKey);
                try
                {
                    in_window.org.pkijs.simpl.PUBLIC_KEY_INFO.prototype.fromSchema.call(_this, asn1.result);
                }
                catch(exception)
                {
                    return new Promise(function(resolve, reject) { reject("Error during initializing object from schema"); });
                }
            },
            function(error)
            {
                return new Promise(function(resolve, reject) { reject("Error during exporting public key: " + error); });
            }
            );
        // #endregion 

        return sequence;
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.PUBLIC_KEY_INFO.prototype.toJSON =
    function()
    {
        return {
            algorithm: this.algorithm.toJSON(),
            subjectPublicKey: this.subjectPublicKey.toJSON()
        };
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "AttributeTypeAndValue" type (part of RelativeDistinguishedName)
    //**************************************************************************************
    in_window.org.pkijs.simpl.ATTR_TYPE_AND_VALUE =
    function()
    {
        // #region Internal properties of the object 
        this.type = "";
        this.value = {}; // ANY -- DEFINED BY AttributeType
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.ATTR_TYPE_AND_VALUE.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.type = (arguments[0].type || "");
                this.value = (arguments[0].value || {});
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.ATTR_TYPE_AND_VALUE.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.ATTR_TYPE_AND_VALUE({
                names: {
                    type: "type",
                    value: "typeValue"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for ATTR_TYPE_AND_VALUE");
        // #endregion 

        // #region Get internal properties from parsed schema 
        this.type = asn1.result.type.value_block.toString();
        this.value = asn1.result.typeValue;
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.ATTR_TYPE_AND_VALUE.prototype.toSchema =
    function()
    {
        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: [
                new in_window.org.pkijs.asn1.OID({ value: this.type }),
                this.value
            ]
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.ATTR_TYPE_AND_VALUE.prototype.isEqual =
    function()
    {
        if(arguments[0] instanceof in_window.org.pkijs.simpl.ATTR_TYPE_AND_VALUE)
        {
            if(this.type !== arguments[0].type)
                return false;

            if(((this.value instanceof in_window.org.pkijs.asn1.UTF8STRING) && (arguments[0].value instanceof in_window.org.pkijs.asn1.UTF8STRING)) ||
               ((this.value instanceof in_window.org.pkijs.asn1.BMPSTRING) && (arguments[0].value instanceof in_window.org.pkijs.asn1.BMPSTRING)) ||
               ((this.value instanceof in_window.org.pkijs.asn1.UNIVERSALSTRING) && (arguments[0].value instanceof in_window.org.pkijs.asn1.UNIVERSALSTRING)) ||
               ((this.value instanceof in_window.org.pkijs.asn1.NUMERICSTRING) && (arguments[0].value instanceof in_window.org.pkijs.asn1.NUMERICSTRING)) ||
               ((this.value instanceof in_window.org.pkijs.asn1.PRINTABLESTRING) && (arguments[0].value instanceof in_window.org.pkijs.asn1.PRINTABLESTRING)) ||
               ((this.value instanceof in_window.org.pkijs.asn1.TELETEXSTRING) && (arguments[0].value instanceof in_window.org.pkijs.asn1.TELETEXSTRING)) ||
               ((this.value instanceof in_window.org.pkijs.asn1.VIDEOTEXSTRING) && (arguments[0].value instanceof in_window.org.pkijs.asn1.VIDEOTEXSTRING)) ||
               ((this.value instanceof in_window.org.pkijs.asn1.IA5STRING) && (arguments[0].value instanceof in_window.org.pkijs.asn1.IA5STRING)) ||
               ((this.value instanceof in_window.org.pkijs.asn1.GRAPHICSTRING) && (arguments[0].value instanceof in_window.org.pkijs.asn1.GRAPHICSTRING)) ||
               ((this.value instanceof in_window.org.pkijs.asn1.VISIBLESTRING) && (arguments[0].value instanceof in_window.org.pkijs.asn1.VISIBLESTRING)) ||
               ((this.value instanceof in_window.org.pkijs.asn1.GENERALSTRING) && (arguments[0].value instanceof in_window.org.pkijs.asn1.GENERALSTRING)) ||
               ((this.value instanceof in_window.org.pkijs.asn1.CHARACTERSTRING) && (arguments[0].value instanceof in_window.org.pkijs.asn1.CHARACTERSTRING)))
            {
                var value1 = in_window.org.pkijs.stringPrep(this.value.value_block.value);
                var value2 = in_window.org.pkijs.stringPrep(arguments[0].value.value_block.value);

                if(value1.localeCompare(value2) !== 0)
                    return false;
            }
            else // Comparing as two ArrayBuffers
            {
                if(in_window.org.pkijs.isEqual_buffer(this.value.value_before_decode, arguments[0].value.value_before_decode) === false)
                    return false;
            }

            return true;
        }
        else
            return false;
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.ATTR_TYPE_AND_VALUE.prototype.toJSON =
    function()
    {
        var _object = {
            type: this.type
        };

        if(Object.keys(this.value).length !== 0)
            _object.value = this.value.toJSON();
        else
            _object.value = this.value;

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "RelativeDistinguishedName" type
    //**************************************************************************************
    in_window.org.pkijs.simpl.RDN =
    function()
    {
        // #region Internal properties of the object 
        /// <field name="types_and_values" type="Array" elementType="in_window.org.pkijs.simpl.ATTR_TYPE_AND_VALUE">Array of "type and value" objects</field>
        this.types_and_values = new Array();
        /// <field name="value_before_decode" type="ArrayBuffer">Value of the RDN before decoding from schema</field>
        this.value_before_decode = new ArrayBuffer(0);
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.RDN.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.types_and_values = (arguments[0].types_and_values || (new Array()));
                this.value_before_decode = arguments[0].value_before_decode || new ArrayBuffer(0);
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.RDN.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.RDN({
                names: {
                    block_name: "RDN",
                    repeated_set: "types_and_values"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for RDN");
        // #endregion 

        // #region Get internal properties from parsed schema 
        if("types_and_values" in asn1.result) // Could be a case when there is no "types and values"
        {
            var types_and_values_array = asn1.result.types_and_values;
            for(var i = 0; i < types_and_values_array.length; i++)
                this.types_and_values.push(new in_window.org.pkijs.simpl.ATTR_TYPE_AND_VALUE({ schema: types_and_values_array[i] }));
        }

        this.value_before_decode = asn1.result.RDN.value_before_decode;
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.RDN.prototype.toSchema =
    function()
    {
        // #region Decode stored TBS value 
        if(this.value_before_decode.byteLength === 0) // No stored encoded array, create "from scratch"
        {
            // #region Create array for output set 
            var output_array = new Array();

            for(var i = 0; i < this.types_and_values.length; i++)
                output_array.push(this.types_and_values[i].toSchema());
            // #endregion 

            return (new in_window.org.pkijs.asn1.SEQUENCE({
                value: [new in_window.org.pkijs.asn1.SET({ value: output_array })]
            }));
        }

        var asn1 = in_window.org.pkijs.fromBER(this.value_before_decode);
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return asn1.result;
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.RDN.prototype.isEqual =
    function()
    {
        if(arguments[0] instanceof in_window.org.pkijs.simpl.RDN)
        {
            if(this.types_and_values.length != arguments[0].types_and_values.length)
                return false;

            for(var i = 0; i < this.types_and_values.length; i++)
            {
                if(this.types_and_values[i].isEqual(arguments[0].types_and_values[i]) === false)
                    return false;
            }

            return true;
        }
        else
        {
            if(arguments[0] instanceof ArrayBuffer)
                return in_window.org.pkijs.isEqual_buffer(this.value_before_decode, arguments[0]);
            else
                return false;
        }

        return false;
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.RDN.prototype.toJSON =
    function()
    {
        var _object = {
            types_and_values: new Array()
        };

        for(var i = 0; i < this.types_and_values.length; i++)
            _object.types_and_values.push(this.types_and_values[i].toJSON());

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "AuthorityKeyIdentifier" type of extension
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.AuthorityKeyIdentifier =
    function()
    {
        // #region Internal properties of the object 
        // OPTIONAL this.keyIdentifier - OCTETSTRING
        // OPTIONAL this.authorityCertIssuer - Array of GeneralName
        // OPTIONAL this.authorityCertSerialNumber - INTEGER
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.x509.AuthorityKeyIdentifier.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                if("keyIdentifier" in arguments[0])
                    this.keyIdentifier = arguments[0].keyIdentifier;

                if("authorityCertIssuer" in arguments[0])
                    this.authorityCertIssuer = arguments[0].authorityCertIssuer;

                if("authorityCertSerialNumber" in arguments[0])
                    this.authorityCertSerialNumber = arguments[0].authorityCertSerialNumber;
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.AuthorityKeyIdentifier.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.x509.AuthorityKeyIdentifier({
                names: {
                    keyIdentifier: "keyIdentifier",
                    authorityCertIssuer: "authorityCertIssuer",
                    authorityCertSerialNumber: "authorityCertSerialNumber"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for AuthorityKeyIdentifier");
        // #endregion 

        // #region Get internal properties from parsed schema 
        if("keyIdentifier" in asn1.result)
        {
            asn1.result["keyIdentifier"].id_block.tag_class = 1; // UNIVERSAL
            asn1.result["keyIdentifier"].id_block.tag_number = 4; // OCTETSTRING

            this.keyIdentifier = asn1.result["keyIdentifier"];
        }

        if("authorityCertIssuer" in asn1.result)
        {
            this.authorityCertIssuer = new Array();
            var issuer_array = asn1.result["authorityCertIssuer"];

            for(var i = 0; i < issuer_array.length; i++)
                this.authorityCertIssuer.push(new in_window.org.pkijs.simpl.GENERAL_NAME({ schema: issuer_array[i] }));
        }

        if("authorityCertSerialNumber" in asn1.result)
        {
            asn1.result["authorityCertSerialNumber"].id_block.tag_class = 1; // UNIVERSAL
            asn1.result["authorityCertSerialNumber"].id_block.tag_number = 2; // INTEGER

            this.authorityCertSerialNumber = asn1.result["authorityCertSerialNumber"];
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.AuthorityKeyIdentifier.prototype.toSchema =
    function()
    {
        // #region Create array for output sequence 
        var output_array = new Array();

        if("keyIdentifier" in this)
        {
            var value = this.keyIdentifier;

            value.id_block.tag_class = 3; // CONTEXT-SPECIFIC
            value.id_block.tag_number = 0; // [0]

            output_array.push(value);
        }

        if("authorityCertIssuer" in this)
        {
            var issuer_array = new Array();

            for(var i = 0; i < this.authorityCertIssuer.length; i++)
                issuer_array.push(this.authorityCertIssuer[i].toSchema());

            output_array.push(new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                optional: true,
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 1 // [1]
                },
                value: [new in_window.org.pkijs.asn1.SEQUENCE({
                    value: issuer_array
                })]
            }));
        }

        if("authorityCertSerialNumber" in this)
        {
            var value = this.authorityCertSerialNumber;

            value.id_block.tag_class = 3; // CONTEXT-SPECIFIC
            value.id_block.tag_number = 2; // [2]

            output_array.push(value);
        }
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.AuthorityKeyIdentifier.prototype.toJSON =
    function()
    {
        var _object = {};

        if("keyIdentifier" in this)
            _object.keyIdentifier = this.keyIdentifier.toJSON();

        if("authorityCertIssuer" in this)
        {
            _object.authorityCertIssuer = new Array();

            for(var i = 0; i < this.authorityCertIssuer.length; i++)
                _object.authorityCertIssuer.push(this.authorityCertIssuer[i].toJSON());
        }

        if("authorityCertSerialNumber" in this)
            _object.authorityCertSerialNumber = this.authorityCertSerialNumber.toJSON();

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "PrivateKeyUsagePeriod" type of extension
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PrivateKeyUsagePeriod =
    function()
    {
        // #region Internal properties of the object 
        // OPTIONAL this.notBefore - new Date()
        // OPTIONAL this.notAfter - new Date()
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.x509.PrivateKeyUsagePeriod.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                if("notBefore" in arguments[0])
                    this.notBefore = arguments[0].notBefore;

                if("notAfter" in arguments[0])
                    this.notAfter = arguments[0].notAfter;
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PrivateKeyUsagePeriod.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.x509.PrivateKeyUsagePeriod({
                names: {
                    notBefore: "notBefore",
                    notAfter: "notAfter"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for PrivateKeyUsagePeriod");
        // #endregion 

        // #region Get internal properties from parsed schema 
        if("notBefore" in asn1.result)
        {
            var localNotBefore = new in_window.org.pkijs.asn1.GENERALIZEDTIME();
            localNotBefore.fromBuffer(asn1.result["notBefore"].value_block.value_hex);
            this.notBefore = localNotBefore.toDate();
        }

        if("notAfter" in asn1.result)
        {
            var localNotAfter = new in_window.org.pkijs.asn1.GENERALIZEDTIME({ value_hex: asn1.result["notAfter"].value_block.value_hex });
            localNotAfter.fromBuffer(asn1.result["notAfter"].value_block.value_hex);
            this.notAfter = localNotAfter.toDate();
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PrivateKeyUsagePeriod.prototype.toSchema =
    function()
    {
        // #region Create array for output sequence 
        var output_array = new Array();

        if("notBefore" in this)
            output_array.push(new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 0 // [0]
                },
                value_hex: (new in_window.org.pkijs.asn1.GENERALIZEDTIME({ value_date: this.notBefore })).value_block.value_hex
            }));

        if("notAfter" in this)
            output_array.push(new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 1 // [1]
                },
                value_hex: (new in_window.org.pkijs.asn1.GENERALIZEDTIME({ value_date: this.notAfter })).value_block.value_hex
            }));
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PrivateKeyUsagePeriod.prototype.toJSON =
    function()
    {
        var _object = {};

        if("notBefore" in this)
            _object.notBefore = this.notBefore;

        if("notAfter" in this)
            _object.notAfter = this.notAfter;

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "IssuerAltName" and "SubjectAltName" types of extension
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.AltName =
    function()
    {
        // #region Internal properties of the object 
        this.altNames = new Array(); //Array of GeneralName
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.x509.AltName.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.altNames = arguments[0].altNames || new Array();
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.AltName.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.x509.AltName({
                names: {
                    altNames: "altNames"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for AltName");
        // #endregion 

        // #region Get internal properties from parsed schema 
        if("altNames" in asn1.result)
        {
            var altNames_array = asn1.result["altNames"];

            for(var i = 0; i < altNames_array.length; i++)
                this.altNames.push(new in_window.org.pkijs.simpl.GENERAL_NAME({ schema: altNames_array[i] }));
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.AltName.prototype.toSchema =
    function()
    {
        // #region Create array for output sequence 
        var output_array = new Array();

        for(var i = 0; i < this.altNames.length; i++)
            output_array.push(this.altNames[i].toSchema());
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.AltName.prototype.toJSON =
    function()
    {
        var _object = {
            altNames: new Array()
        };

        for(var i = 0; i < this.altNames.length; i++)
            _object.altNames.push(this.altNames[i].toJSON());

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "SubjectDirectoryAttributes" type of extension
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.SubjectDirectoryAttributes =
    function()
    {
        // #region Internal properties of the object 
        this.attributes = new Array(); // Array of "simpl.ATTRIBUTE"
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.x509.SubjectDirectoryAttributes.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.attributes = arguments[0].attributes || new Array(); // Array of "simpl.ATTRIBUTE"
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.SubjectDirectoryAttributes.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.x509.SubjectDirectoryAttributes({
                names: {
                    attributes: "attributes"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for SubjectDirectoryAttributes");
        // #endregion 

        // #region Get internal properties from parsed schema
        var attrs = asn1.result["attributes"];

        for(var i = 0; i < attrs.length; i++)
            this.attributes.push(new in_window.org.pkijs.simpl.ATTRIBUTE({ schema: attrs[i] }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.SubjectDirectoryAttributes.prototype.toSchema =
    function()
    {
        // #region Create array for output sequence 
        var output_array = new Array();

        for(var i = 0; i < this.attributes.length; i++)
            output_array.push(this.attributes[i].toSchema());
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.SubjectDirectoryAttributes.prototype.toJSON =
    function()
    {
        var _object = {
            attributes: new Array()
        };

        for(var i = 0; i < this.attributes.length; i++)
            _object.attributes.push(this.attributes[i].toJSON());

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "PolicyMapping" type
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PolicyMapping =
    function()
    {
        // #region Internal properties of the object 
        this.issuerDomainPolicy = "";
        this.subjectDomainPolicy = "";
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.x509.PolicyMapping.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.issuerDomainPolicy = arguments[0].issuerDomainPolicy || "";
                this.subjectDomainPolicy = arguments[0].subjectDomainPolicy || "";
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PolicyMapping.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.x509.PolicyMapping({
                names: {
                    issuerDomainPolicy: "issuerDomainPolicy",
                    subjectDomainPolicy: "subjectDomainPolicy"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for PolicyMapping");
        // #endregion 

        // #region Get internal properties from parsed schema
        this.issuerDomainPolicy = asn1.result["issuerDomainPolicy"].value_block.toString();
        this.subjectDomainPolicy = asn1.result["subjectDomainPolicy"].value_block.toString();
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PolicyMapping.prototype.toSchema =
    function()
    {
        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: [
                new in_window.org.pkijs.asn1.OID({ value: this.issuerDomainPolicy }),
                new in_window.org.pkijs.asn1.OID({ value: this.subjectDomainPolicy })
            ]
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PolicyMapping.prototype.toJSON =
    function()
    {
        return {
            issuerDomainPolicy: this.issuerDomainPolicy,
            subjectDomainPolicy: this.subjectDomainPolicy
        };
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "PolicyMappings" type of extension
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PolicyMappings =
    function()
    {
        // #region Internal properties of the object 
        this.mappings = new Array(); // Array of "simpl.x509.PolicyMapping"
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.x509.PolicyMappings.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.mappings = arguments[0].mappings || new Array();
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PolicyMappings.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.x509.PolicyMappings({
                names: {
                    mappings: "mappings"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for PolicyMappings");
        // #endregion 

        // #region Get internal properties from parsed schema 
        var maps = asn1.result["mappings"];

        for(var i = 0; i < maps.length; i++)
            this.mappings.push(new in_window.org.pkijs.simpl.x509.PolicyMapping({ schema: maps[i] }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PolicyMappings.prototype.toSchema =
    function()
    {
        // #region Create array for output sequence 
        var output_array = new Array();

        for(var i = 0; i < this.mappings.length; i++)
            output_array.push(this.mappings.toSchema());
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PolicyMappings.prototype.toJSON =
    function()
    {
        var _object = {
            mappings: new Array()
        };

        for(var i = 0; i < this.mappings.length; i++)
            _object.mappings.push(this.mappings[i].toJSON());

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "GeneralSubtree" type
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.GeneralSubtree =
    function()
    {
        // #region Internal properties of the object 
        this.base = new in_window.org.pkijs.simpl.GENERAL_NAME();
        // OPTIONAL this.minimum // in_window.org.pkijs.asn1.INTEGER
        // OPTIONAL this.maximum // in_window.org.pkijs.asn1.INTEGER
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.x509.GeneralSubtree.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.base = arguments[0].base || new in_window.org.pkijs.simpl.GENERAL_NAME();

                if("minimum" in arguments[0])
                    this.minimum = arguments[0].minimum;

                if("maximum" in arguments[0])
                    this.maximum = arguments[0].maximum;
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.GeneralSubtree.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.x509.GeneralSubtree({
                names: {
                    base: {
                        names: {
                            block_name: "base"
                        }
                    },
                    minimum: "minimum",
                    maximum: "maximum"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for ");
        // #endregion 

        // #region Get internal properties from parsed schema 
        this.base = new in_window.org.pkijs.simpl.GENERAL_NAME({ schema: asn1.result["base"] });

        if("minimum" in asn1.result)
        {
            if(asn1.result["minimum"].value_block.is_hex_only)
                this.minimum = asn1.result["minimum"];
            else
                this.minimum = asn1.result["minimum"].value_block.value_dec;
        }

        if("maximum" in asn1.result)
        {
            if(asn1.result["maximum"].value_block.is_hex_only)
                this.maximum = asn1.result["maximum"];
            else
                this.maximum = asn1.result["maximum"].value_block.value_dec;
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.GeneralSubtree.prototype.toSchema =
    function()
    {
        // #region Create array for output sequence 
        var output_array = new Array();

        output_array.push(this.base.toSchema());

        if("minimum" in this)
        {
            var value_minimum = 0;

            if(this.minimum instanceof in_window.org.pkijs.asn1.INTEGER)
                value_minimum = this.minimum;
            else
                value_minimum = new in_window.org.pkijs.asn1.INTEGER({ value: this.minimum });

            output_array.push(new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                optional: true,
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 0 // [0]
                },
                value: [value_minimum]
            }));
        }

        if("maximum" in this)
        {
            var value_maximum = 0;

            if(this.maximum instanceof in_window.org.pkijs.asn1.INTEGER)
                value_maximum = this.maximum;
            else
                value_maximum = new in_window.org.pkijs.asn1.INTEGER({ value: this.maximum });

            output_array.push(new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                optional: true,
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 1 // [1]
                },
                value: [value_maximum]
            }));
        }
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.GeneralSubtree.prototype.toJSON =
    function()
    {
        var _object = {
            base: this.base.toJSON()
        };

        if("minimum" in this)
        {
            if((typeof this.minimum) === "number")
                _object.minimum = this.minimum;
            else
                _object.minimum = this.minimum.toJSON();
        }

        if("maximum" in this)
        {
            if((typeof this.maximum) === "number")
                _object.maximum = this.maximum;
            else
                _object.maximum = this.maximum.toJSON();
        }

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "NameConstraints" type of extension
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.NameConstraints =
    function()
    {
        // #region Internal properties of the object 
        // OPTIONAL this.permittedSubtrees - Array of "simpl.x509.GeneralSubtree"
        // OPTIONAL this.excludedSubtrees - Array of "simpl.x509.GeneralSubtree"
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.x509.NameConstraints.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                if("permittedSubtrees" in arguments[0])
                    this.permittedSubtrees = arguments[0].permittedSubtrees;

                if("excludedSubtrees" in arguments[0])
                    this.excludedSubtrees = arguments[0].excludedSubtrees;
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.NameConstraints.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.x509.NameConstraints({
                names: {
                    permittedSubtrees: "permittedSubtrees",
                    excludedSubtrees: "excludedSubtrees"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for NameConstraints");
        // #endregion 

        // #region Get internal properties from parsed schema 
        if("permittedSubtrees" in asn1.result)
        {
            this.permittedSubtrees = new Array();
            var permited_array = asn1.result["permittedSubtrees"];

            for(var i = 0; i < permited_array.length; i++)
                this.permittedSubtrees.push(new in_window.org.pkijs.simpl.x509.GeneralSubtree({ schema: permited_array[i] }));
        }

        if("excludedSubtrees" in asn1.result)
        {
            this.excludedSubtrees = new Array();
            var excluded_array = asn1.result["excludedSubtrees"];

            for(var i = 0; i < excluded_array.length; i++)
                this.excludedSubtrees.push(new in_window.org.pkijs.simpl.x509.GeneralSubtree({ schema: excluded_array[i] }));
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.NameConstraints.prototype.toSchema =
    function()
    {
        // #region Create array for output sequence 
        var output_array = new Array();

        if("permittedSubtrees" in this)
        {
            var permited_array = new Array();

            for(var i = 0; i < this.permittedSubtrees.length; i++)
                permited_array.push(this.permittedSubtrees[i].toSchema());

            output_array.push(new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                optional: true,
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 0 // [0]
                },
                value: [new in_window.org.pkijs.asn1.SEQUENCE({
                    value: permited_array
                })]
            }));
        }

        if("excludedSubtrees" in this)
        {
            var excluded_array = new Array();

            for(var i = 0; i < this.excludedSubtrees.length; i++)
                excluded_array.push(this.excludedSubtrees[i].toSchema());

            output_array.push(new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                optional: true,
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 1 // [1]
                },
                value: [new in_window.org.pkijs.asn1.SEQUENCE({
                    value: excluded_array
                })]
            }));
        }
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.NameConstraints.prototype.toJSON =
    function()
    {
        var _object = {};

        if("permittedSubtrees" in this)
        {
            _object.permittedSubtrees = new Array();

            for(var i = 0; i < this.permittedSubtrees.length; i++)
                _object.permittedSubtrees.push(this.permittedSubtrees[i].toJSON());
        }

        if("excludedSubtrees" in this)
        {
            _object.excludedSubtrees = new Array();

            for(var i = 0; i < this.excludedSubtrees.length; i++)
                _object.excludedSubtrees.push(this.excludedSubtrees[i].toJSON());
        }

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "BasicConstraints" type of extension
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.BasicConstraints =
    function()
    {
        // #region Internal properties of the object 
        // OPTIONAL this.cA - boolean value
        // OPTIONAL this.pathLenConstraint - integer value
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.x509.BasicConstraints.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                if("cA" in arguments[0])
                    this.cA = arguments[0].cA;

                if("pathLenConstraint" in arguments[0])
                    this.pathLenConstraint = arguments[0].pathLenConstraint;
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.BasicConstraints.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.x509.BasicConstraints({
                names: {
                    cA: "cA",
                    pathLenConstraint: "pathLenConstraint"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for BasicConstraints");
        // #endregion 

        // #region Get internal properties from parsed schema 
        if("cA" in asn1.result)
            this.cA = asn1.result["cA"].value_block.value;

        if("pathLenConstraint" in asn1.result)
            this.pathLenConstraint = asn1.result["pathLenConstraint"].value_block.value_dec;
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.BasicConstraints.prototype.toSchema =
    function()
    {
        // #region Create array for output sequence 
        var output_array = new Array();

        if("cA" in this)
            output_array.push(new in_window.org.pkijs.asn1.BOOLEAN({ value: this.cA }));

        if("pathLenConstraint" in this)
            output_array.push(new in_window.org.pkijs.asn1.INTEGER({ value: this.pathLenConstraint }));
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.BasicConstraints.prototype.toJSON =
    function()
    {
        var _object = {};

        if("cA" in this)
            _object.cA = this.cA;

        if("pathLenConstraint" in this)
            _object.pathLenConstraint = this.pathLenConstraint;

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "PolicyQualifierInfo" type
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PolicyQualifierInfo =
    function()
    {
        // #region Internal properties of the object 
        this.policyQualifierId = "";
        this.qualifier = new in_window.org.pkijs.asn1.ANY();
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.x509.PolicyQualifierInfo.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.policyQualifierId = arguments[0].policyQualifierId || "";
                this.qualifier = arguments[0].qualifier || new in_window.org.pkijs.asn1.ANY();
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PolicyQualifierInfo.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.x509.PolicyQualifierInfo({
                names: {
                    policyQualifierId: "policyQualifierId",
                    qualifier: "qualifier"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for PolicyQualifierInfo");
        // #endregion 

        // #region Get internal properties from parsed schema 
        this.policyQualifierId = asn1.result["policyQualifierId"].value_block.toString();
        this.qualifier = asn1.result["qualifier"];
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PolicyQualifierInfo.prototype.toSchema =
    function()
    {
        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: [
                new in_window.org.pkijs.asn1.OID({ value: this.policyQualifierId }),
                this.qualifier
            ]
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PolicyQualifierInfo.prototype.toJSON =
    function()
    {
        return {
            policyQualifierId: this.policyQualifierId,
            qualifier: this.qualifier.toJSON()
        };
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "PolicyInformation" type
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PolicyInformation =
    function()
    {
        // #region Internal properties of the object 
        this.policyIdentifier = "";
        // OPTIONAL this.policyQualifiers = new Array(); // Array of "simpl.x509.PolicyQualifierInfo"
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.x509.PolicyInformation.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.policyIdentifier = arguments[0].policyIdentifier || "";

                if("policyQualifiers" in arguments[0])
                    this.policyQualifiers = arguments[0].policyQualifiers;
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PolicyInformation.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.x509.PolicyInformation({
                names: {
                    policyIdentifier: "policyIdentifier",
                    policyQualifiers: "policyQualifiers"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for PolicyInformation");
        // #endregion 

        // #region Get internal properties from parsed schema 
        this.policyIdentifier = asn1.result["policyIdentifier"].value_block.toString();

        if("policyQualifiers" in asn1.result)
        {
            this.policyQualifiers = new Array();
            var qualifiers = asn1.result["policyQualifiers"];

            for(var i = 0; i < qualifiers.length; i++)
                this.policyQualifiers.push(new in_window.org.pkijs.simpl.x509.PolicyQualifierInfo({ schema: qualifiers[i] }));
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PolicyInformation.prototype.toSchema =
    function()
    {
        // #region Create array for output sequence 
        var output_array = new Array();

        output_array.push(new in_window.org.pkijs.asn1.OID({ value: this.policyIdentifier }));

        if("policyQualifiers" in this)
        {
            var qualifiers = new Array();

            for(var i = 0; i < this.policyQualifiers.length; i++)
                qualifiers.push(this.policyQualifiers[i].toSchema());

            output_array.push(new in_window.org.pkijs.asn1.SEQUENCE({
                value: qualifiers
            }));
        }
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PolicyInformation.prototype.toJSON =
    function()
    {
        var _object = {
            policyIdentifier: this.policyIdentifier
        };

        if("policyQualifiers" in this)
        {
            _object.policyQualifiers = new Array();

            for(var i = 0; i < this.policyQualifiers.length; i++)
                _object.policyQualifiers.push(this.policyQualifiers[i].toJSON());
        }

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "CertificatePolicies" type of extension
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.CertificatePolicies =
    function()
    {
        // #region Internal properties of the object 
        this.certificatePolicies = new Array(); // Array of "simpl.x509.PolicyInformation"
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.x509.CertificatePolicies.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.certificatePolicies = arguments[0].certificatePolicies || new Array(); // Array of "simpl.x509.PolicyInformation"
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.CertificatePolicies.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.x509.CertificatePolicies({
                names: {
                    certificatePolicies: "certificatePolicies"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for CertificatePolicies");
        // #endregion 

        // #region Get internal properties from parsed schema
        var policies = asn1.result["certificatePolicies"];

        for(var i = 0; i < policies.length; i++)
            this.certificatePolicies.push(new in_window.org.pkijs.simpl.x509.PolicyInformation({ schema: policies[i] }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.CertificatePolicies.prototype.toSchema =
    function()
    {
        // #region Create array for output sequence 
        var output_array = new Array();

        for(var i = 0; i < this.certificatePolicies.length; i++)
            output_array.push(this.certificatePolicies[i].toSchema());
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.CertificatePolicies.prototype.toJSON =
    function()
    {
        var _object = {
            certificatePolicies: new Array()
        };

        for(var i = 0; i < this.certificatePolicies.length; i++)
            _object.certificatePolicies.push(this.certificatePolicies[i].toJSON());

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "PolicyConstraints" type of extension
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PolicyConstraints =
    function()
    {
        // #region Internal properties of the object 
        // OPTIONAL this.requireExplicitPolicy = 0;
        // OPTIONAL this.inhibitPolicyMapping = 0;
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.x509.PolicyConstraints.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.requireExplicitPolicy = arguments[0].requireExplicitPolicy || 0;
                this.inhibitPolicyMapping = arguments[0].inhibitPolicyMapping || 0;
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PolicyConstraints.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.x509.PolicyConstraints({
                names: {
                    requireExplicitPolicy: "requireExplicitPolicy",
                    inhibitPolicyMapping: "inhibitPolicyMapping"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for PolicyConstraints");
        // #endregion 

        // #region Get internal properties from parsed schema
        if("requireExplicitPolicy" in asn1.result)
        {
            var field1 = asn1.result["requireExplicitPolicy"];

            field1.id_block.tag_class = 1; // UNIVERSAL
            field1.id_block.tag_number = 2; // INTEGER

            var ber1 = field1.toBER(false);
            var int1 = in_window.org.pkijs.fromBER(ber1);

            this.requireExplicitPolicy = int1.result.value_block.value_dec;
        }

        if("inhibitPolicyMapping" in asn1.result)
        {
            var field2 = asn1.result["inhibitPolicyMapping"];

            field2.id_block.tag_class = 1; // UNIVERSAL
            field2.id_block.tag_number = 2; // INTEGER

            var ber2 = field2.toBER(false);
            var int2 = in_window.org.pkijs.fromBER(ber2);

            this.inhibitPolicyMapping = int2.result.value_block.value_dec;
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PolicyConstraints.prototype.toSchema =
    function()
    {
        // #region Create correct values for output sequence 
        var output_array = new Array();

        if("requireExplicitPolicy" in this)
        {
            var int1 = new in_window.org.pkijs.asn1.INTEGER({ value: this.requireExplicitPolicy });

            int1.id_block.tag_class = 3; // CONTEXT-SPECIFIC
            int1.id_block.tag_number = 0; // [0]

            output_array.push(int1);
        }

        if("inhibitPolicyMapping" in this)
        {
            var int2 = new in_window.org.pkijs.asn1.INTEGER({ value: this.inhibitPolicyMapping });

            int1.id_block.tag_class = 3; // CONTEXT-SPECIFIC
            int1.id_block.tag_number = 1; // [1]

            output_array.push(int2);
        }
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.PolicyConstraints.prototype.toJSON =
    function()
    {
        var _object = {};

        if("requireExplicitPolicy" in this)
            _object.requireExplicitPolicy = this.requireExplicitPolicy;

        if("inhibitPolicyMapping" in this)
            _object.inhibitPolicyMapping = this.inhibitPolicyMapping;

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "ExtKeyUsage" type of extension
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.ExtKeyUsage =
    function()
    {
        // #region Internal properties of the object 
        this.keyPurposes = new Array(); // Array of strings (OIDs value for key purposes)
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.x509.ExtKeyUsage.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.keyPurposes = arguments[0].keyPurposes || new Array(); // Array of strings (OIDs value for key purposes)
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.ExtKeyUsage.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.x509.ExtKeyUsage({
                names: {
                    keyPurposes: "keyPurposes"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for ExtKeyUsage");
        // #endregion 

        // #region Get internal properties from parsed schema 
        var purposes = asn1.result["keyPurposes"];

        for(var i = 0; i < purposes.length; i++)
            this.keyPurposes.push(purposes[i].value_block.toString());
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.ExtKeyUsage.prototype.toSchema =
    function()
    {
        // #region Create array for output sequence 
        var output_array = new Array();

        for(var i = 0; i < this.keyPurposes.length; i++)
            output_array.push(new in_window.org.pkijs.asn1.OID({ value: this.keyPurposes[i] }));
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.ExtKeyUsage.prototype.toJSON =
    function()
    {
        var _object = {
            keyPurposes: new Array()
        };

        for(var i = 0; i < this.keyPurposes.length; i++)
            _object.keyPurposes.push(this.keyPurposes[i]);

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "DistributionPoint" type
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.DistributionPoint =
    function()
    {
        // #region Internal properties of the object 
        // OPTIONAL this.distributionPoint // Array of "simpl.GENERAL_NAME" or a value of "simpl.RDN" type
        // OPTIONAL this.reasons // BITSTRING value
        // OPTIONAL this.cRLIssuer // Array of "simpl.GENERAL_NAME"
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.x509.DistributionPoint.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                if("distributionPoint" in arguments[0])
                    this.distributionPoint = arguments[0].distributionPoint;

                if("reasons" in arguments[0])
                    this.reasons = arguments[0].reasons;

                if("cRLIssuer" in arguments[0])
                    this.cRLIssuer = arguments[0].cRLIssuer;
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.DistributionPoint.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.x509.DistributionPoint({
                names: {
                    distributionPoint: "distributionPoint",
                    distributionPoint_names: "distributionPoint_names",
                    reasons: "reasons",
                    cRLIssuer: "cRLIssuer",
                    cRLIssuer_names: "cRLIssuer_names"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for DistributionPoint");
        // #endregion 

        // #region Get internal properties from parsed schema 
        if("distributionPoint" in asn1.result)
        {
            if(asn1.result["distributionPoint"].id_block.tag_number == 0) // GENERAL_NAMES variant
            {
                this.distributionPoint = new Array();
                var names = asn1.result["distributionPoint_names"];

                for(var i = 0; i < names.length; i++)
                    this.distributionPoint.push(new in_window.org.pkijs.simpl.GENERAL_NAME({ schema: names[i] }));
            }

            if(asn1.result["distributionPoint"].id_block.tag_number == 1) // RDN variant
            {
                asn1.result["distributionPoint"].id_block.tag_class = 1; // UNIVERSAL
                asn1.result["distributionPoint"].id_block.tag_number = 16; // SEQUENCE

                this.distributionPoint = new in_window.org.pkijs.simpl.RDN({ schema: asn1.result["distributionPoint"] });
            }
        }

        if("reasons" in asn1.result)
            this.reasons = new in_window.org.pkijs.asn1.BITSTRING({ value_hex: asn1.result["reasons"].value_block.value_hex });

        if("cRLIssuer" in asn1.result)
        {
            this.cRLIssuer = new Array();
            var crl_names = asn1.result["cRLIssuer_names"];

            for(var i = 0; i < crl_names; i++)
                this.cRLIssuer.push(new in_window.org.pkijs.simpl.GENERAL_NAME({ schema: crl_names[i] }));
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.DistributionPoint.prototype.toSchema =
    function()
    {
        // #region Create array for output sequence 
        var output_array = new Array();

        if("distributionPoint" in this)
        {
            var internalValue;

            if(this.distributionPoint instanceof Array)
            {
                var namesArray = new Array();

                for(var i = 0; i < this.distributionPoint.length; i++)
                    namesArray.push(this.distributionPoint[i].toSchema());

                internalValue = new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 0 // [0]
                    },
                    value: namesArray
                });
            }
            else
            {
                internalValue = new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 1 // [1]
                    },
                    value: [this.distributionPoint.toSchema()]
                });
            }

            output_array.push(new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 0 // [0]
                },
                value: [internalValue]
            }));
        }

        if("reasons" in this)
        {
            output_array.push(new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 1 // [1]
                },
                value_hex: this.reasons.value_block.value_hex
            }));
        }

        if("cRLIssuer" in this)
        {
            var value = new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                name: (names.cRLIssuer || ""),
                optional: true,
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 2 // [2]
                }
            });

            for(var i = 0; i < this.cRLIssuer.length; i++)
                value.value_block.value.push(this.cRLIssuer[i].toSchema());

            output_array.push(value);
        }
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.DistributionPoint.prototype.toJSON =
    function()
    {
        var _object = {};

        if("distributionPoint" in this)
        {
            if(this.distributionPoint instanceof Array)
            {
                _object.distributionPoint = new Array();

                for(var i = 0; i < this.distributionPoint.length; i++)
                    _object.distributionPoint.push(this.distributionPoint[i].toJSON());
            }
            else
                _object.distributionPoint = this.distributionPoint.toJSON();
        }

        if("reasons" in this)
            _object.reasons = this.reasons.toJSON();

        if("cRLIssuer" in this)
        {
            _object.cRLIssuer = new Array();

            for(var i = 0; i < this.cRLIssuer.length; i++)
                _object.cRLIssuer.push(this.cRLIssuer[i].toJSON());
        }

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "CRLDistributionPoints" type of extension
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.CRLDistributionPoints =
    function()
    {
        // #region Internal properties of the object 
        this.distributionPoints = new Array(); // Array of "simpl.x509.DistributionPoint"
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.x509.CRLDistributionPoints.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.distributionPoints = arguments[0].distributionPoints || new Array(); // Array of "simpl.x509.DistributionPoint"
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.CRLDistributionPoints.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.x509.CRLDistributionPoints({
                names: {
                    distributionPoints: "distributionPoints"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for CRLDistributionPoints");
        // #endregion 

        // #region Get internal properties from parsed schema 
        var points = asn1.result["distributionPoints"];

        for(var i = 0; i < points.length; i++)
            this.distributionPoints.push(new in_window.org.pkijs.simpl.x509.DistributionPoint({ schema: points[i] }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.CRLDistributionPoints.prototype.toSchema =
    function()
    {
        // #region Create array for output sequence 
        var output_array = new Array();

        for(var i = 0; i < this.distributionPoints.length; i++)
            output_array.push(this.distributionPoints[i].toSchema());
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.CRLDistributionPoints.prototype.toJSON =
    function()
    {
        var _object = {
            distributionPoints: new Array()
        };

        for(var i = 0; i < this.distributionPoints.length; i++)
            _object.distributionPoints.push(this.distributionPoints[i].toJSON());

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "AccessDescription" type
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.AccessDescription =
    function()
    {
        // #region Internal properties of the object 
        this.accessMethod = "";
        this.accessLocation = new in_window.org.pkijs.simpl.GENERAL_NAME();
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.x509.AccessDescription.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.accessMethod = arguments[0].accessMethod || "";
                this.accessLocation = arguments[0].accessLocation || new in_window.org.pkijs.simpl.GENERAL_NAME();
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.AccessDescription.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.x509.AccessDescription({
                names: {
                    accessMethod: "accessMethod",
                    accessLocation: {
                        names: {
                            block_name: "accessLocation"
                        }
                    }
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for AccessDescription");
        // #endregion 

        // #region Get internal properties from parsed schema 
        this.accessMethod = asn1.result["accessMethod"].value_block.toString();
        this.accessLocation = new in_window.org.pkijs.simpl.GENERAL_NAME({ schema: asn1.result["accessLocation"] });
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.AccessDescription.prototype.toSchema =
    function()
    {
        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: [
                new in_window.org.pkijs.asn1.OID({ value: this.accessMethod }),
                this.accessLocation.toSchema()
            ]
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.AccessDescription.prototype.toJSON =
    function()
    {
        return {
            accessMethod: this.accessMethod,
            accessLocation: this.accessLocation.toJSON()
        };
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "AuthorityInfoAccess" and "SubjectInfoAccess" types of extension
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.InfoAccess =
    function()
    {
        // #region Internal properties of the object 
        this.accessDescriptions = new Array(); // Array of "simpl.x509.AccessDescription"
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.x509.InfoAccess.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.accessDescriptions = arguments[0].accessDescriptions || new Array(); // Array of "simpl.x509.DistributionPoint"
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.InfoAccess.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.x509.InfoAccess({
                names: {
                    accessDescriptions: "accessDescriptions"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for InfoAccess");
        // #endregion 

        // #region Get internal properties from parsed schema 
        var descriptions = asn1.result["accessDescriptions"];

        for(var i = 0; i < descriptions.length; i++)
            this.accessDescriptions.push(new in_window.org.pkijs.simpl.x509.AccessDescription({ schema: descriptions[i] }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.InfoAccess.prototype.toSchema =
    function()
    {
        // #region Create array for output sequence 
        var output_array = new Array();

        for(var i = 0; i < this.accessDescriptions.length; i++)
            output_array.push(this.accessDescriptions[i].toSchema());
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.InfoAccess.prototype.toJSON =
    function()
    {
        var _object = {
            accessDescriptions: new Array()
        };

        for(var i = 0; i < this.accessDescriptions.length; i++)
            _object.accessDescriptions.push(this.accessDescriptions[i].toJSON());

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "IssuingDistributionPoint" type of extension
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.IssuingDistributionPoint =
    function()
    {
        // #region Internal properties of the object 
        // OPTIONAL this.distributionPoint // Array of "simpl.GENERAL_NAME" or a value of "simpl.RDN" type
        // OPTIONAL this.onlyContainsUserCerts // BOOLEAN flag
        // OPTIONAL this.onlyContainsCACerts // BOOLEAN flag
        // OPTIONAL this.onlySomeReasons // BITSTRING
        // OPTIONAL this.indirectCRL // BOOLEAN flag
        // OPTIONAL this.onlyContainsAttributeCerts // BOOLEAN flag
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.x509.IssuingDistributionPoint.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                if("distributionPoint" in arguments[0])
                    this.distributionPoint = arguments[0].distributionPoint;

                if("onlyContainsUserCerts" in arguments[0])
                    this.onlyContainsUserCerts = arguments[0].onlyContainsUserCerts;

                if("onlyContainsCACerts" in arguments[0])
                    this.onlyContainsCACerts = arguments[0].onlyContainsCACerts;

                if("onlySomeReasons" in arguments[0])
                    this.onlySomeReasons = arguments[0].onlySomeReasons;

                if("indirectCRL" in arguments[0])
                    this.indirectCRL = arguments[0].indirectCRL;

                if("onlyContainsAttributeCerts" in arguments[0])
                    this.onlyContainsAttributeCerts = arguments[0].onlyContainsAttributeCerts;
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.IssuingDistributionPoint.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.x509.IssuingDistributionPoint({
                names: {
                    distributionPoint: "distributionPoint",
                    onlyContainsUserCerts: "onlyContainsUserCerts",
                    onlyContainsCACerts: "onlyContainsCACerts",
                    onlySomeReasons: "onlySomeReasons",
                    indirectCRL: "indirectCRL",
                    onlyContainsAttributeCerts: "onlyContainsAttributeCerts"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for IssuingDistributionPoint");
        // #endregion 

        // #region Get internal properties from parsed schema 
        if("distributionPoint" in asn1.result)
        {
            if(asn1.result["distributionPoint"].id_block.tag_number == 0) // GENERAL_NAMES variant
            {
                this.distributionPoint = new Array();
                var names = asn1.result["distributionPoint_names"];

                for(var i = 0; i < names.length; i++)
                    this.distributionPoint.push(new in_window.org.pkijs.simpl.GENERAL_NAME({ schema: names[i] }));
            }

            if(asn1.result["distributionPoint"].id_block.tag_number == 1) // RDN variant
            {
                asn1.result["distributionPoint"].id_block.tag_class = 1; // UNIVERSAL
                asn1.result["distributionPoint"].id_block.tag_number = 16; // SEQUENCE

                this.distributionPoint = new in_window.org.pkijs.simpl.RDN({ schema: asn1.result["distributionPoint"] });
            }
        }

        if("onlyContainsUserCerts" in asn1.result)
        {
            var view = new Uint8Array(asn1.result["onlyContainsUserCerts"].value_block.value_hex);
            this.onlyContainsUserCerts = (view[0] === 0x00) ? false : true;
        }

        if("onlyContainsCACerts" in asn1.result)
        {
            var view = new Uint8Array(asn1.result["onlyContainsCACerts"].value_block.value_hex);
            this.onlyContainsCACerts = (view[0] === 0x00) ? false : true;
        }

        if("onlySomeReasons" in asn1.result)
        {
            var view = new Uint8Array(asn1.result["onlySomeReasons"].value_block.value_hex);
            this.onlySomeReasons = view[0];
        }

        if("indirectCRL" in asn1.result)
        {
            var view = new Uint8Array(asn1.result["indirectCRL"].value_block.value_hex);
            this.indirectCRL = (view[0] === 0x00) ? false : true;
        }

        if("onlyContainsAttributeCerts" in asn1.result)
        {
            var view = new Uint8Array(asn1.result["onlyContainsAttributeCerts"].value_block.value_hex);
            this.onlyContainsAttributeCerts = (view[0] === 0x00) ? false : true;
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.IssuingDistributionPoint.prototype.toSchema =
    function()
    {
        // #region Create array for output sequence 
        var output_array = new Array();

        if("distributionPoint" in this)
        {
            var value;

            if(this.distributionPoint instanceof Array)
            {
                value = new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                    id_block: {
                        tag_class: 3, // CONTEXT-SPECIFIC
                        tag_number: 0 // [0]
                    }
                });

                for(var i = 0; i < this.distributionPoint.length; i++)
                    value.value_block.value.push(this.distributionPoint[i].toSchema());
            }
            else
            {
                value = this.distributionPoint.toSchema();

                value.id_block.tag_class = 3; // CONTEXT - SPECIFIC
                value.id_block.tag_number = 1; // [1]
            }

            output_array.push(value);
        }

        if("onlyContainsUserCerts" in this)
        {
            var buffer = new ArrayBuffer(1);
            var view = new Uint8Array(buffer);

            view[0] = (this.onlyContainsUserCerts === false) ? 0x00 : 0xFF;

            output_array.push(new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                name: (names.onlyContainsUserCerts || ""),
                optional: true,
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 1 // [1]
                },
                value_hex: buffer
            }));
        }

        if("onlyContainsCACerts" in this)
        {
            var buffer = new ArrayBuffer(1);
            var view = new Uint8Array(buffer);

            view[0] = (this.onlyContainsCACerts === false) ? 0x00 : 0xFF;

            output_array.push(new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                name: (names.onlyContainsUserCerts || ""),
                optional: true,
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 2 // [2]
                },
                value_hex: buffer
            }));
        }

        if("onlySomeReasons" in this)
        {
            var buffer = new ArrayBuffer(1);
            var view = new Uint8Array(buffer);

            view[0] = this.onlySomeReasons;

            output_array.push(new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                name: (names.onlyContainsUserCerts || ""),
                optional: true,
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 3 // [3]
                },
                value_hex: buffer
            }));
        }

        if("indirectCRL" in this)
        {
            var buffer = new ArrayBuffer(1);
            var view = new Uint8Array(buffer);

            view[0] = (this.indirectCRL === false) ? 0x00 : 0xFF;

            output_array.push(new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                name: (names.onlyContainsUserCerts || ""),
                optional: true,
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 4 // [4]
                },
                value_hex: buffer
            }));
        }

        if("onlyContainsAttributeCerts" in this)
        {
            var buffer = new ArrayBuffer(1);
            var view = new Uint8Array(buffer);

            view[0] = (this.onlyContainsAttributeCerts === false) ? 0x00 : 0xFF;

            output_array.push(new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                name: (names.onlyContainsUserCerts || ""),
                optional: true,
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 5 // [5]
                },
                value_hex: buffer
            }));
        }
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.x509.IssuingDistributionPoint.prototype.toJSON =
    function()
    {
        var _object = {};

        if("distributionPoint" in this)
        {
            if(this.distributionPoint instanceof Array)
            {
                _object.distributionPoint = new Array();

                for(var i = 0; i < this.distributionPoint.length; i++)
                    _object.distributionPoint.push(this.distributionPoint[i].toJSON());
            }
            else
                _object.distributionPoint = this.distributionPoint.toJSON();
        }

        if("onlyContainsUserCerts" in this)
            _object.onlyContainsUserCerts = this.onlyContainsUserCerts;

        if("onlyContainsCACerts" in this)
            _object.onlyContainsCACerts = this.onlyContainsCACerts;

        if("onlySomeReasons" in this)
            _object.onlySomeReasons = this.onlySomeReasons.toJSON();

        if("indirectCRL" in this)
            _object.indirectCRL = this.indirectCRL;

        if("onlyContainsAttributeCerts" in this)
            _object.onlyContainsAttributeCerts = this.onlyContainsAttributeCerts;

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "Extension" type
    //**************************************************************************************
    in_window.org.pkijs.simpl.EXTENSION =
    function()
    {
        // #region Internal properties of the object 
        this.extnID = "";
        this.critical = false;
        this.extnValue = new in_window.org.pkijs.asn1.OCTETSTRING();

        // OPTIONAL this.parsedValue - Parsed "extnValue" in case of well-known "extnID"
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.EXTENSION.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.extnID = (arguments[0].extnID || "");
                this.critical = (arguments[0].critical || false);
                if("extnValue" in arguments[0])
                    this.extnValue = new in_window.org.pkijs.asn1.OCTETSTRING({ value_hex: arguments[0].extnValue });
                else
                    this.extnValue = new in_window.org.pkijs.asn1.OCTETSTRING();

                if("parsedValue" in arguments[0])
                    this.parsedValue = arguments[0].parsedValue;
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.EXTENSION.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.EXTENSION({
                names: {
                    extnID: "extnID",
                    critical: "critical",
                    extnValue: "extnValue"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for EXTENSION");
        // #endregion 

        // #region Get internal properties from parsed schema 
        this.extnID = asn1.result.extnID.value_block.toString();
        if("critical" in asn1.result)
            this.critical = asn1.result.critical.value_block.value;
        this.extnValue = asn1.result.extnValue;

        // #region Get "parsedValue" for well-known extensions 
        var asn1 = in_window.org.pkijs.fromBER(this.extnValue.value_block.value_hex);
        if(asn1.offset === (-1))
            return;

        switch(this.extnID)
        {
            case "2.5.29.9": // SubjectDirectoryAttributes
                this.parsedValue = new in_window.org.pkijs.simpl.x509.SubjectDirectoryAttributes({ schema: asn1.result });
                break;
            case "2.5.29.14": // SubjectKeyIdentifier
                this.parsedValue = asn1.result; // Should be just a simple OCTETSTRING
                break;
            case "2.5.29.15": // KeyUsage
                this.parsedValue = asn1.result; // Should be just a simple BITSTRING
                break;
            case "2.5.29.16": // PrivateKeyUsagePeriod
                this.parsedValue = new in_window.org.pkijs.simpl.x509.PrivateKeyUsagePeriod({ schema: asn1.result });
                break;
            case "2.5.29.17": // SubjectAltName
            case "2.5.29.18": // IssuerAltName
                this.parsedValue = new in_window.org.pkijs.simpl.x509.AltName({ schema: asn1.result });
                break;
            case "2.5.29.19": // BasicConstraints
                this.parsedValue = new in_window.org.pkijs.simpl.x509.BasicConstraints({ schema: asn1.result });
                break;
            case "2.5.29.20": // CRLNumber
            case "2.5.29.27": // BaseCRLNumber (delta CRL indicator)
                this.parsedValue = asn1.result; // Should be just a simple INTEGER
                break;
            case "2.5.29.21": // CRLReason
                this.parsedValue = asn1.result; // Should be just a simple ENUMERATED
                break;
            case "2.5.29.24": // InvalidityDate
                this.parsedValue = asn1.result; // Should be just a simple GeneralizedTime
                break;
            case "2.5.29.28": // IssuingDistributionPoint
                this.parsedValue = new in_window.org.pkijs.simpl.x509.IssuingDistributionPoint({ schema: asn1.result });
                break;
            case "2.5.29.29": // CertificateIssuer
                this.parsedValue = new in_window.org.pkijs.simpl.GENERAL_NAMES({ schema: asn1.result }); // Should be just a simple 
                break;
            case "2.5.29.30": // NameConstraints
                this.parsedValue = new in_window.org.pkijs.simpl.x509.NameConstraints({ schema: asn1.result });
                break;
            case "2.5.29.31": // CRLDistributionPoints
            case "2.5.29.46": // FreshestCRL
                this.parsedValue = new in_window.org.pkijs.simpl.x509.CRLDistributionPoints({ schema: asn1.result });
                break;
            case "2.5.29.32": // CertificatePolicies
                this.parsedValue = new in_window.org.pkijs.simpl.x509.CertificatePolicies({ schema: asn1.result });
                break;
            case "2.5.29.33": // PolicyMappings
                this.parsedValue = new in_window.org.pkijs.simpl.x509.PolicyMappings({ schema: asn1.result });
                break;
            case "2.5.29.35": // AuthorityKeyIdentifier
                this.parsedValue = new in_window.org.pkijs.simpl.x509.AuthorityKeyIdentifier({ schema: asn1.result });
                break;
            case "2.5.29.36": // PolicyConstraints
                this.parsedValue = new in_window.org.pkijs.simpl.x509.PolicyConstraints({ schema: asn1.result });
                break;
            case "2.5.29.37": // ExtKeyUsage
                this.parsedValue = new in_window.org.pkijs.simpl.x509.ExtKeyUsage({ schema: asn1.result });
                break;
            case "2.5.29.54": // InhibitAnyPolicy
                this.parsedValue = asn1.result; // Should be just a simple INTEGER
                break;
            case "1.3.6.1.5.5.7.1.1": // AuthorityInfoAccess
            case "1.3.6.1.5.5.7.1.11": // SubjectInfoAccess
                this.parsedValue = new in_window.org.pkijs.simpl.x509.InfoAccess({ schema: asn1.result });
                break;
            default:;
        }
        // #endregion 
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.EXTENSION.prototype.toSchema =
    function()
    {
        // #region Create array for output sequence 
        var output_array = new Array();

        output_array.push(new in_window.org.pkijs.asn1.OID({ value: this.extnID }));

        if(this.critical)
            output_array.push(new in_window.org.pkijs.asn1.BOOLEAN({ value: this.critical }));

        output_array.push(this.extnValue);
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.EXTENSION.prototype.toJSON =
    function()
    {
        var _object = {
            extnID: this.extnID,
            critical: this.critical,
            extnValue: this.extnValue.toJSON()
        };

        if("parsedValue" in this)
            _object.parsedValue = this.parsedValue.toJSON();

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "Extensions" type (sequence of many Extension)
    //**************************************************************************************
    in_window.org.pkijs.simpl.EXTENSIONS =
    function()
    {
        // #region Internal properties of the object 
        this.extensions_array = new Array();
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.EXTENSIONS.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
                this.extensions_array = (arguments[0].extensions_array || (new Array()));
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.EXTENSIONS.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.EXTENSIONS({
                names: {
                    extensions: "extensions"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for EXTENSIONS");
        // #endregion 

        // #region Get internal properties from parsed schema 
        for(var i = 0; i < asn1.result.extensions.length; i++)
            this.extensions_array.push(new in_window.org.pkijs.simpl.EXTENSION({ schema: asn1.result.extensions[i] }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.EXTENSIONS.prototype.toSchema =
    function()
    {
        // #region Construct and return new ASN.1 schema for this object 
        var extension_schemas = new Array();

        for(var i = 0; i < this.extensions_array.length; i++)
            extension_schemas.push(this.extensions_array[i].toSchema());

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: extension_schemas
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.EXTENSIONS.prototype.toJSON =
    function()
    {
        var _object = {
            extensions_array: new Array()
        };

        for(var i = 0; i < this.extensions_array.length; i++)
            _object.extensions_array.push(this.extensions_array[i].toJSON());

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for X.509 v3 certificate (RFC5280)
    //**************************************************************************************
    in_window.org.pkijs.simpl.CERT =
    function()
    {
        // #region Internal properties of the object 
        // #region Properties from certificate TBS part 
        this.tbs = new ArrayBuffer(0); // Encoded value of certificate TBS (need to have it for certificate validation)

        // OPTIONAL this.version = 0;
        this.serialNumber = new in_window.org.pkijs.asn1.INTEGER(); // Might be a very long integer value
        this.signature = new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER(); // Signature algorithm from certificate TBS part
        this.issuer = new in_window.org.pkijs.simpl.RDN();
        this.notBefore = new in_window.org.pkijs.simpl.TIME();
        this.notAfter = new in_window.org.pkijs.simpl.TIME();
        this.subject = new in_window.org.pkijs.simpl.RDN();
        this.subjectPublicKeyInfo = new in_window.org.pkijs.simpl.PUBLIC_KEY_INFO();
        // OPTIONAL this.issuerUniqueID = new ArrayBuffer(0); // IMPLICIT bistring value
        // OPTIONAL this.subjectUniqueID = new ArrayBuffer(0); // IMPLICIT bistring value
        // OPTIONAL this.extensions = new Array(); // Array of "simpl.EXTENSION"
        // #endregion 

        // #region Properties from certificate major part 
        this.signatureAlgorithm = new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER(); // Signature algorithm from certificate major part
        this.signatureValue = new in_window.org.pkijs.asn1.BITSTRING();
        // #endregion 
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.CERT.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                // #region Properties from certificate TBS part 
                this.tbs = arguments[0].tbs || new ArrayBuffer(0);

                if("version" in arguments[0])
                    this.version = arguments[0].version;
                this.serialNumber = arguments[0].serialNumber || new in_window.org.pkijs.asn1.INTEGER(); // Might be a very long integer value
                this.signature = arguments[0].signature || new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER(); // Signature algorithm from certificate TBS part
                this.issuer = arguments[0].issuer || new in_window.org.pkijs.simpl.RDN();
                this.notBefore = arguments[0].not_before || new in_window.org.pkijs.simpl.TIME();
                this.notAfter = arguments[0].not_after || new in_window.org.pkijs.simpl.TIME();
                this.subject = arguments[0].subject || new in_window.org.pkijs.simpl.RDN();
                this.subjectPublicKeyInfo = arguments[0].subjectPublicKeyInfo || new in_window.org.pkijs.simpl.PUBLIC_KEY_INFO();
                if("issuerUniqueID" in arguments[0])
                    this.issuerUniqueID = arguments[0].issuerUniqueID;
                if("subjectUniqueID" in arguments[0])
                    this.subjectUniqueID = arguments[0].subjectUniqueID;
                if("extensions" in arguments[0])
                    this.extensions = arguments[0].extensions;
                // #endregion 

                // #region Properties from certificate major part 
                this.signatureAlgorithm = new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER(); // Signature algorithm from certificate major part
                this.signatureValue = new in_window.org.pkijs.asn1.BITSTRING();
                // #endregion 
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.CERT.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.CERT({
                names: {
                    tbsCertificate: {
                        names: {
                            extensions: {
                                names: {
                                    extensions: "tbsCertificate.extensions"
                                }
                            }
                        }
                    }
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for CERT");
        // #endregion 

        // #region Get internal properties from parsed schema 
        this.tbs = asn1.result["tbsCertificate"].value_before_decode;

        if("tbsCertificate.version" in asn1.result)
            this.version = asn1.result["tbsCertificate.version"].value_block.value_dec;
        this.serialNumber = asn1.result["tbsCertificate.serialNumber"];
        this.signature = new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER({ schema: asn1.result["tbsCertificate.signature"] });
        this.issuer = new in_window.org.pkijs.simpl.RDN({ schema: asn1.result["tbsCertificate.issuer"] });
        this.notBefore = new in_window.org.pkijs.simpl.TIME({ schema: asn1.result["tbsCertificate.notBefore"] });
        this.notAfter = new in_window.org.pkijs.simpl.TIME({ schema: asn1.result["tbsCertificate.notAfter"] });
        this.subject = new in_window.org.pkijs.simpl.RDN({ schema: asn1.result["tbsCertificate.subject"] });
        this.subjectPublicKeyInfo = new in_window.org.pkijs.simpl.PUBLIC_KEY_INFO({ schema: asn1.result["tbsCertificate.subjectPublicKeyInfo"] });
        if("tbsCertificate.issuerUniqueID" in asn1.result)
            this.issuerUniqueID = asn1.result["tbsCertificate.issuerUniqueID"].value_block.value_hex;
        if("tbsCertificate.subjectUniqueID" in asn1.result)
            this.issuerUniqueID = asn1.result["tbsCertificate.subjectUniqueID"].value_block.value_hex;
        if("tbsCertificate.extensions" in asn1.result)
        {
            this.extensions = new Array();

            var extensions = asn1.result["tbsCertificate.extensions"];

            for(var i = 0; i < extensions.length; i++)
                this.extensions.push(new in_window.org.pkijs.simpl.EXTENSION({ schema: extensions[i] }));
        }

        this.signatureAlgorithm = new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER({ schema: asn1.result["signatureAlgorithm"] });
        this.signatureValue = asn1.result["signatureValue"];
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.CERT.prototype.encodeTBS =
    function()
    {
        /// <summary>Create ASN.1 schema for existing values of TBS part for the certificate</summary>

        // #region Create array for output sequence 
        var output_array = new Array();

        if("version" in this)
            output_array.push(new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                optional: true,
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 0 // [0]
                },
                value: [
                    new in_window.org.pkijs.asn1.INTEGER({ value: this.version }) // EXPLICIT integer value
                ]
            }));

        output_array.push(this.serialNumber);
        output_array.push(this.signature.toSchema());
        output_array.push(this.issuer.toSchema());

        output_array.push(new in_window.org.pkijs.asn1.SEQUENCE({
            value: [
                this.notBefore.toSchema(),
                this.notAfter.toSchema()
            ]
        }));

        output_array.push(this.subject.toSchema());
        output_array.push(this.subjectPublicKeyInfo.toSchema());

        if("issuerUniqueID" in this)
            output_array.push(new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                optional: true,
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 1 // [1]
                },
                value_hex: this.issuerUniqueID
            }));
        if("subjectUniqueID" in this)
            output_array.push(new in_window.org.pkijs.asn1.ASN1_PRIMITIVE({
                optional: true,
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 2 // [2]
                },
                value_hex: this.subjectUniqueID
            }));

        if("subjectUniqueID" in this)
            output_array.push(new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                optional: true,
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 3 // [3]
                },
                value: [this.extensions.toSchema()]
            }));

        if("extensions" in this)
        {
            var extensions = new Array();

            for(var i = 0; i < this.extensions.length; i++)
                extensions.push(this.extensions[i].toSchema());

            output_array.push(new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                optional: true,
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 3 // [3]
                },
                value: [new in_window.org.pkijs.asn1.SEQUENCE({
                    value: extensions
                })]
            }));
        }
        // #endregion 

        // #region Create and return output sequence 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.CERT.prototype.toSchema =
    function(encodeFlag)
    {
        /// <param name="encodeFlag" type="Boolean">If param equal to false then create TBS schema via decoding stored value. In othe case create TBS schema via assembling from TBS parts.</param>

        if(typeof encodeFlag === "undefined")
            encodeFlag = false;

        var tbs_schema = {};

        // #region Decode stored TBS value 
        if(encodeFlag === false)
        {
            if(this.tbs.length === 0) // No stored certificate TBS part
                return in_window.org.pkijs.schema.CERT().value[0];

            var tbs_asn1 = in_window.org.pkijs.fromBER(this.tbs);

            tbs_schema = tbs_asn1.result;
        }
        // #endregion 
        // #region Create TBS schema via assembling from TBS parts 
        else
            tbs_schema = in_window.org.pkijs.simpl.CERT.prototype.encodeTBS.call(this);
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: [
                tbs_schema,
                this.signatureAlgorithm.toSchema(),
                this.signatureValue
            ]
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.CERT.prototype.verify =
    function()
    {
        /// <summary>!!! Works well in Chrome dev versions only (April 2014th) !!!</summary>
        /// <returns type="Promise">Returns a new Promise object (in case of error), or a result of "crypto.subtle.veryfy" function</returns>

        // #region Global variables 
        var sequence = Promise.resolve();

        var subjectPublicKeyInfo = {};

        var signature = this.signatureValue;
        var tbs = this.tbs;

        var _this = this;
        // #endregion 

        // #region Set correct "subjectPublicKeyInfo" value 
        if(this.issuer.isEqual(this.subject)) // Self-signed certificate
            subjectPublicKeyInfo = this.subjectPublicKeyInfo;
        else
        {
            if(arguments[0] instanceof Object)
            {
                if("issuerCertificate" in arguments[0]) // Must be of type "simpl.CERT"
                    subjectPublicKeyInfo = arguments[0].issuerCertificate.subjectPublicKeyInfo;
            }

            if((subjectPublicKeyInfo instanceof in_window.org.pkijs.simpl.PUBLIC_KEY_INFO) === false)
                return new Promise(function(resolve, reject) { reject("Please provide issuer certificate as a parameter"); });
        }
        // #endregion 

        // #region Get a "crypto" extension 
        var crypto = in_window.org.pkijs.getCrypto();
        if(typeof crypto == "undefined")
            return new Promise(function(resolve, reject) { reject("Unable to create WebCrypto object"); });
        // #endregion 

        // #region Find signer's hashing algorithm 
        var sha_algorithm = in_window.org.pkijs.getHashAlgorithm(this.signatureAlgorithm);
        if(sha_algorithm === "")
            return new Promise(function(resolve, reject) { reject("Unsupported signature algorithm: " + _this.signatureAlgorithm.algorithm_id); });
        // #endregion 

        // #region Importing public key 
        sequence = sequence.then(
            function()
            {
                // #region Get information about public key algorithm and default parameters for import
                var algorithmObject = in_window.org.pkijs.getAlgorithmByOID(_this.signatureAlgorithm.algorithm_id);
                if(("name" in algorithmObject) === false)
                    return new Promise(function(resolve, reject) { reject("Unsupported public key algorithm: " + _this.signatureAlgorithm.algorithm_id); });

                var algorithm_name = algorithmObject.name;

                var algorithm = in_window.org.pkijs.getAlgorithmParameters(algorithm_name, "importkey");
                if("hash" in algorithm.algorithm)
                    algorithm.algorithm.hash.name = sha_algorithm;
                // #endregion 

                var publicKeyInfo_schema = subjectPublicKeyInfo.toSchema();
                var publicKeyInfo_buffer = publicKeyInfo_schema.toBER(false);
                var publicKeyInfo_view = new Uint8Array(publicKeyInfo_buffer);

                return crypto.importKey("spki", publicKeyInfo_view, algorithm.algorithm, true, algorithm.usages);
            }
            );
        // #endregion 

        // #region Verify signature for the certificate 
        sequence = sequence.then(
            function(publicKey)
            {
                // #region Get default algorithm parameters for verification 
                var algorithm = in_window.org.pkijs.getAlgorithmParameters(publicKey.algorithm.name, "verify");
                if("hash" in algorithm.algorithm)
                    algorithm.algorithm.hash.name = sha_algorithm;
                // #endregion 

                // #region Special case for ECDSA signatures 
                var signature_value = signature.value_block.value_hex;

                if(publicKey.algorithm.name === "ECDSA")
                {
                    var asn1 = in_window.org.pkijs.fromBER(signature_value);
                    signature_value = in_window.org.pkijs.createECDSASignatureFromCMS(asn1.result);
                }
                // #endregion 

                // #region Special case for RSA-PSS 
                if(publicKey.algorithm.name === "RSA-PSS")
                {
                    var pssParameters;

                    try
                    {
                        pssParameters = new in_window.org.pkijs.simpl.x509.RSASSA_PSS_params({ schema: _this.signatureAlgorithm.algorithm_params });
                    }
                    catch(ex)
                    {
                        return new Promise(function(resolve, reject) { reject(ex); });
                    }

                    if("saltLength" in pssParameters)
                        algorithm.algorithm.saltLength = pssParameters.saltLength;
                    else
                        algorithm.algorithm.saltLength = 20;

                    var hash_algo = "SHA-1";

                    if("hashAlgorithm" in pssParameters)
                    {
                        var hashAlgorithm = in_window.org.pkijs.getAlgorithmByOID(pssParameters.hashAlgorithm.algorithm_id);
                        if(("name" in hashAlgorithm) === false)
                            return new Promise(function(resolve, reject) { reject("Unrecognized hash algorithm: " + pssParameters.hashAlgorithm.algorithm_id); });

                        hash_algo = hashAlgorithm.name;
                    }

                    algorithm.algorithm.hash.name = hash_algo;
                }
                // #endregion 

                return crypto.verify(algorithm.algorithm,
                    publicKey,
                    new Uint8Array(signature_value),
                    new Uint8Array(tbs));
            }
            );
        // #endregion 

        return sequence;
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.CERT.prototype.sign =
    function(privateKey, hashAlgorithm)
    {
        /// <param name="privateKey" type="CryptoKey">Private key for "subjectPublicKeyInfo" structure</param>
        /// <param name="hashAlgorithm" type="String" optional="true">Hashing algorithm. Default SHA-1</param>

        // #region Initial variables 
        var _this = this;
        // #endregion 

        // #region Get a private key from function parameter 
        if(typeof privateKey === "undefined")
            return new Promise(function(resolve, reject) { reject("Need to provide a private key for signing"); });
        // #endregion 

        // #region Get hashing algorithm 
        if(typeof hashAlgorithm === "undefined")
            hashAlgorithm = "SHA-1";
        else
        {
            // #region Simple check for supported algorithm 
            var oid = in_window.org.pkijs.getOIDByAlgorithm({ name: hashAlgorithm });
            if(oid === "")
                return new Promise(function(resolve, reject) { reject("Unsupported hash algorithm: " + hashAlgorithm); });
            // #endregion 
        }
        // #endregion 

        // #region Get a "default parameters" for current algorithm 
        var defParams = in_window.org.pkijs.getAlgorithmParameters(privateKey.algorithm.name, "sign");
        defParams.algorithm.hash.name = hashAlgorithm;
        // #endregion 

        // #region Fill internal structures base on "privateKey" and "hashAlgorithm" 
        switch(privateKey.algorithm.name.toUpperCase())
        {
            case "RSASSA-PKCS1-V1_5":
            case "ECDSA":
                _this.signature.algorithm_id = in_window.org.pkijs.getOIDByAlgorithm(defParams.algorithm);
                _this.signatureAlgorithm.algorithm_id = _this.signature.algorithm_id;
                break;
            case "RSA-PSS":
                {
                    // #region Set "saltLength" as a length (in octets) of hash function result 
                    switch(hashAlgorithm.toUpperCase())
                    {
                        case "SHA-256":
                            defParams.algorithm.saltLength = 32;
                            break;
                        case "SHA-384":
                            defParams.algorithm.saltLength = 48;
                            break;
                        case "SHA-512":
                            defParams.algorithm.saltLength = 64;
                            break;
                        default:;
                    }
                    // #endregion 

                    // #region Fill "RSASSA_PSS_params" object 
                    var paramsObject = {};

                    if(hashAlgorithm.toUpperCase() !== "SHA-1")
                    {
                        var hashAlgorithmOID = in_window.org.pkijs.getOIDByAlgorithm({ name: hashAlgorithm });
                        if(hashAlgorithmOID === "")
                            return new Promise(function(resolve, reject) { reject("Unsupported hash algorithm: " + hashAlgorithm); });

                        paramsObject.hashAlgorithm = new org.pkijs.simpl.ALGORITHM_IDENTIFIER({
                            algorithm_id: hashAlgorithmOID,
                            algorithm_params: new org.pkijs.asn1.NULL()
                        });

                        paramsObject.maskGenAlgorithm = new org.pkijs.simpl.ALGORITHM_IDENTIFIER({
                            algorithm_id: "1.2.840.113549.1.1.8", // MGF1
                            algorithm_params: paramsObject.hashAlgorithm.toSchema()
                        })
                    }

                    if(defParams.algorithm.saltLength !== 20)
                        paramsObject.saltLength = defParams.algorithm.saltLength;

                    var pssParameters = new in_window.org.pkijs.simpl.x509.RSASSA_PSS_params(paramsObject);
                    // #endregion   

                    // #region Automatically set signature algorithm 
                    _this.signature = new org.pkijs.simpl.ALGORITHM_IDENTIFIER({
                        algorithm_id: "1.2.840.113549.1.1.10",
                        algorithm_params: pssParameters.toSchema()
                    });
                    _this.signatureAlgorithm = _this.signature; // Must be the same
                    // #endregion 
                }
                break;
            default:
                return new Promise(function(resolve, reject) { reject("Unsupported signature algorithm: " + privateKey.algorithm.name); });
        }
        // #endregion 

        // #region Create TBS data for signing 
        _this.tbs = in_window.org.pkijs.simpl.CERT.prototype.encodeTBS.call(this).toBER(false);
        // #endregion 

        // #region Get a "crypto" extension 
        var crypto = in_window.org.pkijs.getCrypto();
        if(typeof crypto == "undefined")
            return new Promise(function(resolve, reject) { reject("Unable to create WebCrypto object"); });
        // #endregion 

        // #region Signing TBS data on provided private key 
        return crypto.sign(defParams.algorithm,
            privateKey,
            new Uint8Array(_this.tbs)).then(
            function(result)
            {
                // #region Special case for ECDSA algorithm 
                if(defParams.algorithm.name === "ECDSA")
                    result = in_window.org.pkijs.createCMSECDSASignature(result);
                // #endregion 

                _this.signatureValue = new in_window.org.pkijs.asn1.BITSTRING({ value_hex: result });
            },
            function(error)
            {
                return new Promise(function(resolve, reject) { reject("Signing error: " + error); });
            }
            );
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.CERT.prototype.getPublicKey =
    function()
    {
        /// <summary>Importing public key for current certificate</summary>

        // #region Initial variables 
        var algorithm;
        // #endregion 

        // #region Get a "crypto" extension 
        var crypto = in_window.org.pkijs.getCrypto();
        if(typeof crypto == "undefined")
            return new Promise(function(resolve, reject) { reject("Unable to create WebCrypto object"); });
        // #endregion 

        // #region Find correct algorithm for imported public key 
        if(arguments[0] instanceof Object)
        {
            if("algorithm" in arguments[0])
                algorithm = arguments[0].algorithm;
            else
                return new Promise(function(resolve, reject) { reject("Absent mandatory parameter \"algorithm\""); });
        }
        else
        {
            // #region Find signer's hashing algorithm 
            var sha_algorithm = in_window.org.pkijs.getHashAlgorithm(this.signatureAlgorithm);
            if(sha_algorithm === "")
                return new Promise(function(resolve, reject) { reject("Unsupported signature algorithm: " + this.signatureAlgorithm.algorithm_id); });
            // #endregion   

            // #region Get information about public key algorithm and default parameters for import
            var algorithmObject = in_window.org.pkijs.getAlgorithmByOID(this.signatureAlgorithm.algorithm_id);
            if(("name" in algorithmObject) === false)
                return new Promise(function(resolve, reject) { reject("Unsupported public key algorithm: " + this.signatureAlgorithm.algorithm_id); });

            var algorithm_name = algorithmObject.name;

            algorithm = in_window.org.pkijs.getAlgorithmParameters(algorithm_name, "importkey");
            if("hash" in algorithm.algorithm)
                algorithm.algorithm.hash.name = sha_algorithm;
            // #endregion 
        }
        // #endregion 

        // #region Get neccessary values from internal fields for current certificate 
        var publicKeyInfo_schema = this.subjectPublicKeyInfo.toSchema();
        var publicKeyInfo_buffer = publicKeyInfo_schema.toBER(false);
        var publicKeyInfo_view = new Uint8Array(publicKeyInfo_buffer);
        // #endregion 

        return crypto.importKey("spki", publicKeyInfo_view, algorithm.algorithm, true, algorithm.usages);
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.CERT.prototype.getKeyHash =
    function()
    {
        /// <summary>Get SHA-1 hash value for subject public key</summary>

        // #region Get a "crypto" extension 
        var crypto = in_window.org.pkijs.getCrypto();
        if(typeof crypto == "undefined")
            return new Promise(function(resolve, reject) { reject("Unable to create WebCrypto object"); });
        // #endregion 

        return crypto.digest({ name: "sha-1" }, new Uint8Array(this.subjectPublicKeyInfo.subjectPublicKey.value_block.value_hex));
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.CERT.prototype.toJSON =
    function()
    {
        var _object = {
            tbs: in_window.org.pkijs.bufferToHexCodes(this.tbs, 0, this.tbs.byteLength),
            serialNumber: this.serialNumber.toJSON(),
            signature: this.signature.toJSON(),
            issuer: this.issuer.toJSON(),
            notBefore: this.notBefore.toJSON(),
            notAfter: this.notAfter.toJSON(),
            subject: this.subject.toJSON(),
            subjectPublicKeyInfo: this.subjectPublicKeyInfo.toJSON(),
            signatureAlgorithm: this.signatureAlgorithm.toJSON(),
            signatureValue: this.signatureValue.toJSON()
        };

        if("version" in this)
            _object.version = this.version;

        if("issuerUniqueID" in this)
            _object.issuerUniqueID = in_window.org.pkijs.bufferToHexCodes(this.issuerUniqueID, 0, this.issuerUniqueID.byteLength);

        if("subjectUniqueID" in this)
            _object.subjectUniqueID = in_window.org.pkijs.bufferToHexCodes(this.subjectUniqueID, 0, this.subjectUniqueID.byteLength);

        if("extensions" in this)
        {
            _object.extensions = new Array();

            for(var i = 0; i < this.extensions.length; i++)
                _object.extensions.push(this.extensions[i].toJSON());
        }

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "revoked certificate" type (to use in CRL)
    //**************************************************************************************
    in_window.org.pkijs.simpl.REV_CERT =
    function()
    {
        // #region Internal properties of the object 
        this.userCertificate = new in_window.org.pkijs.asn1.INTEGER();
        this.revocationDate = new in_window.org.pkijs.simpl.TIME();
        // OPTIONAL this.crlEntryExtensions = new Array(); // Array of "in_window.org.pkijs.simpl.EXTENSION");
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.REV_CERT.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.userCertificate = arguments[0].userCertificate || new in_window.org.pkijs.asn1.INTEGER();
                this.revocationDate = arguments[0].revocationDate || new in_window.org.pkijs.simpl.TIME();
                if("crlEntryExtensions" in arguments[0])
                    this.crlEntryExtensions = arguments[0].crlEntryExtensions;
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.REV_CERT.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            new in_window.org.pkijs.asn1.SEQUENCE({
                value: [
                    new in_window.org.pkijs.asn1.INTEGER({ name: "userCertificate" }),
                    in_window.org.pkijs.schema.TIME({
                        names: {
                            utcTimeName: "revocationDate",
                            generalTimeName: "revocationDate"
                    }
                    }),
                    in_window.org.pkijs.schema.EXTENSIONS({
                        names: {
                            block_name: "crlEntryExtensions"
                        }
                    }, true)
                ]
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for REV_CERT");
        // #endregion 

        // #region Get internal properties from parsed schema 
        this.userCertificate = asn1.result["userCertificate"];
        this.revocationDate = new in_window.org.pkijs.simpl.TIME({ schema: asn1.result["revocationDate"] });

        if("crlEntryExtensions" in asn1.result)
        {
            this.crlEntryExtensions = new Array();
            var exts = asn1.result["crlEntryExtensions"].value_block.value;

            for(var i = 0; i < exts.length; i++)
                this.crlEntryExtensions.push(new in_window.org.pkijs.simpl.EXTENSION({ schema: exts[i] }));
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.REV_CERT.prototype.toSchema =
    function()
    {
        // #region Create array for output sequence 
        var sequence_array = new Array();
        sequence_array.push(this.userCertificate);
        sequence_array.push(this.revocationDate.toSchema());

        if("crlEntryExtensions" in this)
        {
            var exts = new Array();

            for(var i = 0; i < this.crlEntryExtensions.length; i++)
                exts.push(this.crlEntryExtensions[i].toSchema());

            sequence_array.push(new in_window.org.pkijs.asn1.SEQUENCE({ value: exts }));
        }
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: sequence_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.REV_CERT.prototype.toJSON =
    function()
    {
        var _object = {
            userCertificate: this.userCertificate.toJSON(),
            revocationDate: this.revocationDate.toJSON
        };

        if("crlEntryExtensions" in this)
        {
            _object.crlEntryExtensions = new Array();

            for(var i = 0; i < this.crlEntryExtensions.length; i++)
                _object.crlEntryExtensions.push(this.crlEntryExtensions[i].toJSON());
        }

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for X.509 CRL (Certificate Revocation List)(RFC5280)  
    //**************************************************************************************
    in_window.org.pkijs.simpl.CRL =
    function()
    {
        // #region Internal properties of the object 
        // #region Properties from CRL TBS part 
        this.tbs = new ArrayBuffer(0);

        // OPTIONAL this.version = 1;
        this.signature = new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER();
        this.issuer = new in_window.org.pkijs.simpl.RDN();
        this.thisUpdate = new in_window.org.pkijs.simpl.TIME();
        // OPTIONAL this.nextUpdate = new in_window.org.pkijs.simpl.TIME();
        // OPTIONAL this.revokedCertificates = new Array(); // Array of REV_CERT objects
        // OPTIONAL this.crlExtensions = new Array(); // Array of in_window.org.pkijs.simpl.EXTENSION();
        // #endregion 

        // #region Properties from CRL major part 
        this.signatureAlgorithm = new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER();
        this.signatureValue = new in_window.org.pkijs.asn1.BITSTRING();
        // #endregion 
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.CRL.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                // #region Properties from CRL TBS part 
                this.tbs = arguments[0].tbs || new ArrayBuffer(0);

                if("version" in arguments[0])
                    this.version = arguments[0].version;
                this.signature = arguments[0].signature || new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER();
                this.issuer = arguments[0].issuer || new in_window.org.pkijs.simpl.RDN();
                this.thisUpdate = arguments[0].thisUpdate || new in_window.org.pkijs.simpl.TIME();
                if("nextUpdate" in arguments[0])
                    this.nextUpdate = arguments[0].nextUpdate;
                if("revokedCertificates" in arguments[0])
                    this.revokedCertificates = arguments[0].revokedCertificates;
                if("crlExtensions" in arguments[0])
                    this.crlExtensions = arguments[0].crlExtensions;
                // #endregion 

                // #region Properties from CRL major part 
                this.signatureAlgorithm = arguments[0].signatureAlgorithm || new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER();
                this.signatureValue = arguments[0].signatureValue || new in_window.org.pkijs.asn1.BITSTRING();
                // #endregion 
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.CRL.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.CRL()
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for CRL");
        // #endregion 

        // #region Get internal properties from parsed schema 
        this.tbs = asn1.result["tbsCertList"].value_before_decode;

        if("tbsCertList.version" in asn1.result)
            this.version = asn1.result["tbsCertList.version"].value_block.value_dec;
        this.signature = new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER({ schema: asn1.result["tbsCertList.signature"] });
        this.issuer = new in_window.org.pkijs.simpl.RDN({ schema: asn1.result["tbsCertList.issuer"] });
        this.thisUpdate = new in_window.org.pkijs.simpl.TIME({ schema: asn1.result["tbsCertList.thisUpdate"] });
        if("tbsCertList.nextUpdate" in asn1.result)
            this.nextUpdate = new in_window.org.pkijs.simpl.TIME({ schema: asn1.result["tbsCertList.nextUpdate"] });
        if("tbsCertList.revokedCertificates" in asn1.result)
        {
            this.revokedCertificates = new Array();

            var rev_certs = asn1.result["tbsCertList.revokedCertificates"];
            for(var i = 0; i < rev_certs.length; i++)
                this.revokedCertificates.push(new in_window.org.pkijs.simpl.REV_CERT({ schema: rev_certs[i] }));
        }
        if("tbsCertList.extensions" in asn1.result)
        {
            this.crlExtensions = new Array();
            var exts = asn1.result["tbsCertList.extensions"].value_block.value;

            for(var i = 0; i < exts.length; i++)
                this.crlExtensions.push(new in_window.org.pkijs.simpl.EXTENSION({ schema: exts[i] }));
        }

        this.signatureAlgorithm = new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER({ schema: asn1.result["signatureAlgorithm"] });
        this.signatureValue = asn1.result["signatureValue"];
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.CRL.prototype.encodeTBS =
    function()
    {
        // #region Create array for output sequence 
        var output_array = new Array();

        if("version" in this)
            output_array.push(new in_window.org.pkijs.asn1.INTEGER({ value: this.version }));

        output_array.push(this.signature.toSchema());
        output_array.push(this.issuer.toSchema());
        output_array.push(this.thisUpdate.toSchema())

        if("nextUpdate" in this)
            output_array.push(this.nextUpdate.toSchema());

        if("revokedCertificates" in this)
        {
            var rev_certificates = new Array();

            for(var i = 0; i < this.revokedCertificates.length; i++)
                rev_certificates.push(this.revokedCertificates[i].toSchema());

            output_array.push(new in_window.org.pkijs.asn1.SEQUENCE({
                value: rev_certificates
            }));
        }

        if("crlExtensions" in this)
        {
            var extensions = new Array();

            for(var j = 0; j < this.crlExtensions.length; j++)
                extensions.push(this.crlExtensions[j].toSchema());

            output_array.push(new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                optional: true,
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 0 // [0]
                },
                value: [
                    new in_window.org.pkijs.asn1.SEQUENCE({
                        value: extensions
                    })
                ]
            }));
        }
        // #endregion 

        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.CRL.prototype.toSchema =
    function(encodeFlag)
    {
        /// <param name="encodeFlag" type="Boolean">If param equal to false then create TBS schema via decoding stored value. In othe case create TBS schema via assembling from TBS parts.</param>

        // #region Check "encodeFlag" 
        if(typeof encodeFlag === "undefined")
            encodeFlag = false;
        // #endregion 

        // #region Decode stored TBS value 
        var tbs_schema;

        if(encodeFlag === false)
        {
            if(this.tbs.length === 0) // No stored TBS part
                return in_window.org.pkijs.schema.CRL();

            tbs_schema = in_window.org.pkijs.fromBER(this.tbs).result;
        }
        // #endregion 
        // #region Create TBS schema via assembling from TBS parts 
        else
            tbs_schema = in_window.org.pkijs.simpl.CRL.prototype.encodeTBS.call(this);
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: [
                tbs_schema,
                this.signatureAlgorithm.toSchema(),
                this.signatureValue
            ]
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.CRL.prototype.verify =
    function()
    {
        /// <summary>!!! Works well in Chrome dev versions only (April 2014th) !!!</summary>
        /// <returns type="Promise">Returns a new Promise object (in case of error), or a result of "crypto.subtle.veryfy" function</returns>

        // #region Global variables 
        var sequence = Promise.resolve();

        var signature = this.signatureValue;
        var tbs = this.tbs;

        var subjectPublicKeyInfo = -1;

        var _this = this;
        // #endregion 

        // #region Get information about CRL issuer certificate 
        if(arguments[0] instanceof Object)
        {
            if("issuerCertificate" in arguments[0]) // "issuerCertificate" must be of type "simpl.CERT"
                subjectPublicKeyInfo = arguments[0].issuerCertificate.subjectPublicKeyInfo;

            // #region In case if there is only public key during verification 
            if("publicKeyInfo" in arguments[0])
                subjectPublicKeyInfo = arguments[0].publicKeyInfo; // Must be of type "org.pkijs.simpl.PUBLIC_KEY_INFO"
            // #endregion 
        }

        if((subjectPublicKeyInfo instanceof in_window.org.pkijs.simpl.PUBLIC_KEY_INFO) === false)
            return new Promise(function(resolve, reject) { reject("Issuer's certificate must be provided as an input parameter"); });
        // #endregion 

        // #region Get a "crypto" extension 
        var crypto = in_window.org.pkijs.getCrypto();
        if(typeof crypto == "undefined")
            return new Promise(function(resolve, reject) { reject("Unable to create WebCrypto object"); });
        // #endregion 

        // #region Find signer's hashing algorithm 
        var sha_algorithm = in_window.org.pkijs.getHashAlgorithm(this.signatureAlgorithm);
        if(sha_algorithm === "")
            return new Promise(function(resolve, reject) { reject("Unsupported signature algorithm: " + _this.signatureAlgorithm.algorithm_id); });
        // #endregion 

        // #region Import public key 
        sequence = sequence.then(
            function()
            {
                // #region Get information about public key algorithm and default parameters for import
                var algorithmObject = in_window.org.pkijs.getAlgorithmByOID(_this.signature.algorithm_id);
                if(("name" in algorithmObject) === "")
                    return new Promise(function(resolve, reject) { reject("Unsupported public key algorithm: " + _this.signature.algorithm_id); });

                var algorithm_name = algorithmObject.name;

                var algorithm = in_window.org.pkijs.getAlgorithmParameters(algorithm_name, "importkey");
                if("hash" in algorithm.algorithm)
                    algorithm.algorithm.hash.name = sha_algorithm;
                // #endregion 

                var publicKeyInfo_schema = subjectPublicKeyInfo.toSchema();
                var publicKeyInfo_buffer = publicKeyInfo_schema.toBER(false);
                var publicKeyInfo_view = new Uint8Array(publicKeyInfo_buffer);

                return crypto.importKey("spki",
                    publicKeyInfo_view,
                    algorithm.algorithm,
                    true,
                    algorithm.usages);
            }
            );
        // #endregion 

        // #region Verify signature for the certificate 
        sequence = sequence.then(
            function(publicKey)
            {
                // #region Get default algorithm parameters for verification 
                var algorithm = in_window.org.pkijs.getAlgorithmParameters(publicKey.algorithm.name, "verify");
                if("hash" in algorithm.algorithm)
                    algorithm.algorithm.hash.name = sha_algorithm;
                // #endregion 

                // #region Special case for ECDSA signatures 
                var signature_value = signature.value_block.value_hex;

                if(publicKey.algorithm.name === "ECDSA")
                {
                    var asn1 = in_window.org.pkijs.fromBER(signature_value);
                    signature_value = in_window.org.pkijs.createECDSASignatureFromCMS(asn1.result);
                }
                // #endregion 

                // #region Special case for RSA-PSS 
                if(publicKey.algorithm.name === "RSA-PSS")
                {
                    var pssParameters;

                    try
                    {
                        pssParameters = new in_window.org.pkijs.simpl.x509.RSASSA_PSS_params({ schema: _this.signatureAlgorithm.algorithm_params });
                    }
                    catch(ex)
                    {
                        return new Promise(function(resolve, reject) { reject(ex); });
                    }

                    if("saltLength" in pssParameters)
                        algorithm.algorithm.saltLength = pssParameters.saltLength;
                    else
                        algorithm.algorithm.saltLength = 20;

                    var hash_algo = "SHA-1";

                    if("hashAlgorithm" in pssParameters)
                    {
                        var hashAlgorithm = in_window.org.pkijs.getAlgorithmByOID(pssParameters.hashAlgorithm.algorithm_id);
                        if(("name" in hashAlgorithm) === false)
                            return new Promise(function(resolve, reject) { reject("Unrecognized hash algorithm: " + pssParameters.hashAlgorithm.algorithm_id); });

                        hash_algo = hashAlgorithm.name;
                    }

                    algorithm.algorithm.hash.name = hash_algo;
                }
                // #endregion 

                return crypto.verify(algorithm.algorithm,
                    publicKey,
                    new Uint8Array(signature_value),
                    new Uint8Array(tbs));
            }
            );
        // #endregion 

        return sequence;
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.CRL.prototype.sign =
    function(privateKey, hashAlgorithm)
    {
        /// <param name="privateKey" type="Key">Private key for "subjectPublicKeyInfo" structure</param>
        /// <param name="hashAlgorithm" type="String" optional="true">Hashing algorithm. Default SHA-1</param>

        // #region Initial variables 
        var _this = this;
        // #endregion 

        // #region Get a private key from function parameter 
        if(typeof privateKey === "undefined")
            return new Promise(function(resolve, reject) { reject("Need to provide a private key for signing"); });
        // #endregion 

        // #region Get hashing algorithm 
        if(typeof hashAlgorithm === "undefined")
            hashAlgorithm = "SHA-1";
        else
        {
            // #region Simple check for supported algorithm 
            var oid = in_window.org.pkijs.getOIDByAlgorithm({ name: hashAlgorithm });
            if(oid === "")
                return new Promise(function(resolve, reject) { reject("Unsupported hash algorithm: " + hashAlgorithm); });
            // #endregion 
        }
        // #endregion 

        // #region Get a "default parameters" for current algorithm 
        var defParams = in_window.org.pkijs.getAlgorithmParameters(privateKey.algorithm.name, "sign");
        defParams.algorithm.hash.name = hashAlgorithm;
        // #endregion 

        // #region Fill internal structures base on "privateKey" and "hashAlgorithm" 
        switch(privateKey.algorithm.name.toUpperCase())
        {
            case "RSASSA-PKCS1-V1_5":
            case "ECDSA":
                _this.signature.algorithm_id = in_window.org.pkijs.getOIDByAlgorithm(defParams.algorithm);
                _this.signatureAlgorithm.algorithm_id = _this.signature.algorithm_id;
                break;
            case "RSA-PSS":
                {
                    // #region Set "saltLength" as a length (in octets) of hash function result 
                    switch(hashAlgorithm.toUpperCase())
                    {
                        case "SHA-256":
                            defParams.algorithm.saltLength = 32;
                            break;
                        case "SHA-384":
                            defParams.algorithm.saltLength = 48;
                            break;
                        case "SHA-512":
                            defParams.algorithm.saltLength = 64;
                            break;
                        default:;
                    }
                    // #endregion 

                    // #region Fill "RSASSA_PSS_params" object 
                    var paramsObject = {};

                    if(hashAlgorithm.toUpperCase() !== "SHA-1")
                    {
                        var hashAlgorithmOID = in_window.org.pkijs.getOIDByAlgorithm({ name: hashAlgorithm });
                        if(hashAlgorithmOID === "")
                            return new Promise(function(resolve, reject) { reject("Unsupported hash algorithm: " + hashAlgorithm); });

                        paramsObject.hashAlgorithm = new org.pkijs.simpl.ALGORITHM_IDENTIFIER({
                            algorithm_id: hashAlgorithmOID,
                            algorithm_params: new org.pkijs.asn1.NULL()
                        });

                        paramsObject.maskGenAlgorithm = new org.pkijs.simpl.ALGORITHM_IDENTIFIER({
                            algorithm_id: "1.2.840.113549.1.1.8", // MGF1
                            algorithm_params: paramsObject.hashAlgorithm.toSchema()
                        })
                    }

                    if(defParams.algorithm.saltLength !== 20)
                        paramsObject.saltLength = defParams.algorithm.saltLength;

                    var pssParameters = new in_window.org.pkijs.simpl.x509.RSASSA_PSS_params(paramsObject);
                    // #endregion   

                    // #region Automatically set signature algorithm 
                    _this.signature = new org.pkijs.simpl.ALGORITHM_IDENTIFIER({
                        algorithm_id: "1.2.840.113549.1.1.10",
                        algorithm_params: pssParameters.toSchema()
                    });
                    _this.signatureAlgorithm = _this.signature; // Must be the same
                    // #endregion 
                }
                break;
            default:
                return new Promise(function(resolve, reject) { reject("Unsupported signature algorithm: " + privateKey.algorithm.name); });
        }
        // #endregion 

        // #region Create TBS data for signing 
        _this.tbs = in_window.org.pkijs.simpl.CRL.prototype.encodeTBS.call(this).toBER(false);
        // #endregion 

        // #region Get a "crypto" extension 
        var crypto = in_window.org.pkijs.getCrypto();
        if(typeof crypto == "undefined")
            return new Promise(function(resolve, reject) { reject("Unable to create WebCrypto object"); });
        // #endregion 

        // #region Signing TBS data on provided private key 
        return crypto.sign(
            defParams.algorithm,
            privateKey,
            new Uint8Array(_this.tbs)).
            then(
            function(result)
            {
                // #region Special case for ECDSA algorithm 
                if(defParams.algorithm.name === "ECDSA")
                    result = in_window.org.pkijs.createCMSECDSASignature(result);
                // #endregion 

                _this.signatureValue = new in_window.org.pkijs.asn1.BITSTRING({ value_hex: result });
            },
            function(error)
            {
                return new Promise(function(resolve, reject) { reject("Signing error: " + error); });
            }
            );
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.CRL.prototype.isCertificateRevoked =
    function()
    {
        // #region Get input certificate 
        var certificate = {};

        if(arguments[0] instanceof Object)
        {
            if("certificate" in arguments[0])
                certificate = arguments[0].certificate;
        }

        if((certificate instanceof in_window.org.pkijs.simpl.CERT) === false)
            return false;
        // #endregion 

        // #region Check that issuer of the input certificate is the same with issuer of this CRL 
        if(this.issuer.isEqual(certificate.issuer) === false)
            return false;
        // #endregion 

        // #region Check that there are revoked certificates in this CRL 
        if(("revokedCertificates" in this) === false)
            return false;
        // #endregion 

        // #region Search for input certificate in revoked certificates array 
        for(var i = 0; i < this.revokedCertificates.length; i++)
        {
            if(this.revokedCertificates[i].userCertificate.isEqual(certificate.serialNumber))
                return true;
        }
        // #endregion 

        return false;
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.CRL.prototype.toJSON =
    function()
    {
        var _object = {
            tbs: in_window.org.pkijs.bufferToHexCodes(this.tbs, 0, this.tbs.byteLength),
            signature: this.signature.toJSON(),
            issuer: this.issuer.toJSON(),
            thisUpdate: this.thisUpdate.toJSON(),
            signatureAlgorithm: this.signatureAlgorithm.toJSON(),
            signatureValue: this.signatureValue.toJSON()
        };

        if("version" in this)
            _object.version = this.version;

        if("nextUpdate" in this)
            _object.nextUpdate = this.nextUpdate.toJSON();

        if("revokedCertificates" in this)
        {
            _object.revokedCertificates = new Array();

            for(var i = 0; i < this.revokedCertificates.length; i++)
                _object.revokedCertificates.push(this.revokedCertificates[i].toJSON());
        }

        if("crlExtensions" in this)
        {
            _object.crlExtensions = new Array();

            for(var i = 0; i < this.crlExtensions.length; i++)
                _object.crlExtensions.push(this.crlExtensions[i].toJSON());
        }

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for "Attribute" type
    //**************************************************************************************
    in_window.org.pkijs.simpl.ATTRIBUTE =
    function()
    {
        // #region Internal properties of the object 
        this.type = "";
        this.values = new Array();
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.ATTRIBUTE.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.type = arguments[0].type || "";
                this.values = arguments[0].values || new Array();
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.ATTRIBUTE.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.ATTRIBUTE({
                names: {
                    type: "type",
                    values: "values"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for ATTRIBUTE");
        // #endregion 

        // #region Get internal properties from parsed schema 
        this.type = asn1.result["type"].value_block.toString();
        this.values = asn1.result["values"];
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.ATTRIBUTE.prototype.toSchema =
    function()
    {
        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: [
                new in_window.org.pkijs.asn1.OID({ value: this.type }),
                new in_window.org.pkijs.asn1.SET({
                    value: this.values
                })
            ]
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.ATTRIBUTE.prototype.toJSON =
    function()
    {
        var _object = {
            type: this.type,
            values: new Array()
        };

        for(var i = 0; i < this.values.length; i++)
            _object.values.push(this.values[i].toJSON());

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for PKCS#10 certificate request
    //**************************************************************************************
    in_window.org.pkijs.simpl.PKCS10 =
    function()
    {
        // #region Internal properties of the object 
        this.tbs = new ArrayBuffer(0);

        this.version = 0;
        this.subject = new in_window.org.pkijs.simpl.RDN();
        this.subjectPublicKeyInfo = new in_window.org.pkijs.simpl.PUBLIC_KEY_INFO();
        // OPTIONAL this.attributes = new Array(); // Array of simpl.ATTRIBUTE objects

        this.signatureAlgorithm = new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER(); // Signature algorithm from certificate major part
        this.signatureValue = new in_window.org.pkijs.asn1.BITSTRING();
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.PKCS10.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.tbs = arguments[0].tbs || new ArrayBuffer(0);

                this.version = arguments[0].version || 0;
                this.subject = arguments[0].subject || new in_window.org.pkijs.simpl.RDN();
                this.subjectPublicKeyInfo = arguments[0].subjectPublicKeyInfo || new in_window.org.pkijs.simpl.PUBLIC_KEY_INFO();

                if("attributes" in arguments[0])
                    this.attributes = arguments[0].attributes;

                this.signatureAlgorithm = arguments[0].signatureAlgorithm || new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER(); // Signature algorithm from certificate major part
                this.signatureValue = arguments[0].signatureValue || new in_window.org.pkijs.asn1.BITSTRING();
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.PKCS10.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.PKCS10()
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for PKCS10");
        // #endregion 

        // #region Get internal properties from parsed schema 
        this.tbs = asn1.result["CertificationRequestInfo"].value_before_decode;

        this.version = asn1.result["CertificationRequestInfo.version"].value_block.value_dec;
        this.subject = new in_window.org.pkijs.simpl.RDN({ schema: asn1.result["CertificationRequestInfo.subject"] });
        this.subjectPublicKeyInfo = new in_window.org.pkijs.simpl.PUBLIC_KEY_INFO({ schema: asn1.result["CertificationRequestInfo.subjectPublicKeyInfo"] });
        if("CertificationRequestInfo.attributes" in asn1.result)
        {
            this.attributes = new Array();

            var attrs = asn1.result["CertificationRequestInfo.attributes"];
            for(var i = 0; i < attrs.length; i++)
                this.attributes.push(new in_window.org.pkijs.simpl.ATTRIBUTE({ schema: attrs[i] }));
        }

        this.signatureAlgorithm = new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER({ schema: asn1.result["signatureAlgorithm"] });
        this.signatureValue = asn1.result["signatureValue"];
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.PKCS10.prototype.encodeTBS =
    function()
    {
        // #region Create array for output sequence 
        var output_array = new Array();

        output_array.push(new in_window.org.pkijs.asn1.INTEGER({ value: this.version }));
        output_array.push(this.subject.toSchema());
        output_array.push(this.subjectPublicKeyInfo.toSchema());

        if("attributes" in this)
        {
            var attributes = new Array();

            for(var i = 0; i < this.attributes.length; i++)
                attributes.push(this.attributes[i].toSchema());

            output_array.push(new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 0 // [0]
                },
                value: attributes
            }));
        }
        // #endregion 

        return (new in_window.org.pkijs.asn1.SEQUENCE({ value: output_array }));
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.PKCS10.prototype.toSchema =
    function(encodeFlag)
    {
        /// <param name="encodeFlag" type="Boolean">If param equal to false then create TBS schema via decoding stored value. In othe case create TBS schema via assembling from TBS parts.</param>

        // #region Check "encodeFlag" 
        if(typeof encodeFlag === "undefined")
            encodeFlag = false;
        // #endregion 

        // #region Decode stored TBS value 
        var tbs_schema;

        if(encodeFlag === false)
        {
            if(this.tbs.length === 0) // No stored TBS part
                return in_window.org.pkijs.schema.PKCS10();

            tbs_schema = in_window.org.pkijs.fromBER(this.tbs).result;
        }
        // #endregion 
        // #region Create TBS schema via assembling from TBS parts 
        else
            tbs_schema = in_window.org.pkijs.simpl.PKCS10.prototype.encodeTBS.call(this);
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: [
                tbs_schema,
                this.signatureAlgorithm.toSchema(),
                this.signatureValue
            ]
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.PKCS10.prototype.verify =
    function()
    {
        /// <summary>!!! Works well in Chrome dev versions only (April 2014th) !!!</summary>
        /// <returns type="Promise">Returns a new Promise object (in case of error), or a result of "crypto.subtle.veryfy" function</returns>

        // #region Global variables 
        var _this = this;
        var sha_algorithm = "";

        var sequence = Promise.resolve();

        var subjectPublicKeyInfo = this.subjectPublicKeyInfo;
        var signature = this.signatureValue;
        var tbs = this.tbs;
        // #endregion 

        // #region Get a "crypto" extension 
        var crypto = in_window.org.pkijs.getCrypto();
        if(typeof crypto == "undefined")
            return new Promise(function(resolve, reject) { reject("Unable to create WebCrypto object"); });
        // #endregion 

        // #region Find a correct hashing algorithm 
        sha_algorithm = in_window.org.pkijs.getHashAlgorithm(this.signatureAlgorithm);
        if(sha_algorithm === "")
            return new Promise(function(resolve, reject) { reject("Unsupported signature algorithm: " + _this.signatureAlgorithm.algorithm_id); });
        // #endregion 

        // #region Importing public key 
        sequence = sequence.then(
            function()
            {
                // #region Get information about public key algorithm and default parameters for import
                var algorithmObject = in_window.org.pkijs.getAlgorithmByOID(_this.signatureAlgorithm.algorithm_id);
                if(("name" in algorithmObject) === false)
                    return new Promise(function(resolve, reject) { reject("Unsupported public key algorithm: " + _this.signatureAlgorithm.algorithm_id); });

                var algorithm_name = algorithmObject.name;

                var algorithm = in_window.org.pkijs.getAlgorithmParameters(algorithm_name, "importkey");
                if("hash" in algorithm.algorithm)
                    algorithm.algorithm.hash.name = sha_algorithm;
                // #endregion 

                var publicKeyInfo_schema = subjectPublicKeyInfo.toSchema();
                var publicKeyInfo_buffer = publicKeyInfo_schema.toBER(false);
                var publicKeyInfo_view = new Uint8Array(publicKeyInfo_buffer);

                return crypto.importKey("spki", publicKeyInfo_view, algorithm.algorithm, true, algorithm.usages);
            }
            );
        // #endregion 

        // #region Verify signature  
        sequence = sequence.then(
            function(publicKey)
            {
                // #region Get default algorithm parameters for verification 
                var algorithm = in_window.org.pkijs.getAlgorithmParameters(publicKey.algorithm.name, "verify");
                if("hash" in algorithm.algorithm)
                    algorithm.algorithm.hash.name = sha_algorithm;
                // #endregion 

                // #region Special case for ECDSA signatures 
                var signature_value = signature.value_block.value_hex;

                if(publicKey.algorithm.name === "ECDSA")
                {
                    var asn1 = in_window.org.pkijs.fromBER(signature_value);
                    signature_value = in_window.org.pkijs.createECDSASignatureFromCMS(asn1.result);
                }
                // #endregion 

                // #region Special case for RSA-PSS 
                if(publicKey.algorithm.name === "RSA-PSS")
                {
                    var pssParameters;

                    try
                    {
                        pssParameters = new in_window.org.pkijs.simpl.x509.RSASSA_PSS_params({ schema: _this.signatureAlgorithm.algorithm_params });
                    }
                    catch(ex)
                    {
                        return new Promise(function(resolve, reject) { reject(ex); });
                    }

                    if("saltLength" in pssParameters)
                        algorithm.algorithm.saltLength = pssParameters.saltLength;
                    else
                        algorithm.algorithm.saltLength = 20;

                    var hash_algo = "SHA-1";

                    if("hashAlgorithm" in pssParameters)
                    {
                        var hashAlgorithm = in_window.org.pkijs.getAlgorithmByOID(pssParameters.hashAlgorithm.algorithm_id);
                        if(("name" in hashAlgorithm) === false)
                            return new Promise(function(resolve, reject) { reject("Unrecognized hash algorithm: " + pssParameters.hashAlgorithm.algorithm_id); });

                        hash_algo = hashAlgorithm.name;
                    }

                    algorithm.algorithm.hash.name = hash_algo;
                }
                // #endregion 

                return crypto.verify(algorithm.algorithm,
                    publicKey,
                    new Uint8Array(signature_value),
                    new Uint8Array(tbs));
            }
            );
        // #endregion   

        return sequence;
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.PKCS10.prototype.sign =
    function(privateKey, hashAlgorithm)
    {
        /// <param name="privateKey" type="Key">Private key for "subjectPublicKeyInfo" structure</param>
        /// <param name="hashAlgorithm" type="String" optional="true">Hashing algorithm. Default SHA-1</param>

        // #region Initial variables 
        var _this = this;
        // #endregion 

        // #region Get a private key from function parameter 
        if(typeof privateKey === "undefined")
            return new Promise(function(resolve, reject) { reject("Need to provide a private key for signing"); });
        // #endregion 

        // #region Get hashing algorithm 
        if(typeof hashAlgorithm === "undefined")
            hashAlgorithm = "SHA-1";
        else
        {
            // #region Simple check for supported algorithm 
            var oid = in_window.org.pkijs.getOIDByAlgorithm({ name: hashAlgorithm });
            if(oid === "")
                return new Promise(function(resolve, reject) { reject("Unsupported hash algorithm: " + hashAlgorithm); });
            // #endregion 
        }
        // #endregion 

        // #region Get a "default parameters" for current algorithm 
        var defParams = in_window.org.pkijs.getAlgorithmParameters(privateKey.algorithm.name, "sign");
        defParams.algorithm.hash.name = hashAlgorithm;
        // #endregion 

        // #region Fill internal structures base on "privateKey" and "hashAlgorithm" 
        switch(privateKey.algorithm.name.toUpperCase())
        {
            case "RSASSA-PKCS1-V1_5":
            case "ECDSA":
                _this.signatureAlgorithm.algorithm_id = in_window.org.pkijs.getOIDByAlgorithm(defParams.algorithm);
                break;
            case "RSA-PSS":
                {
                    // #region Set "saltLength" as a length (in octets) of hash function result 
                    switch(hashAlgorithm.toUpperCase())
                    {
                        case "SHA-256":
                            defParams.algorithm.saltLength = 32;
                            break;
                        case "SHA-384":
                            defParams.algorithm.saltLength = 48;
                            break;
                        case "SHA-512":
                            defParams.algorithm.saltLength = 64;
                            break;
                        default:;
                    }
                    // #endregion 

                    // #region Fill "RSASSA_PSS_params" object 
                    var paramsObject = {};

                    if(hashAlgorithm.toUpperCase() !== "SHA-1")
                    {
                        var hashAlgorithmOID = in_window.org.pkijs.getOIDByAlgorithm({ name: hashAlgorithm });
                        if(hashAlgorithmOID === "")
                            return new Promise(function(resolve, reject) { reject("Unsupported hash algorithm: " + hashAlgorithm); });

                        paramsObject.hashAlgorithm = new org.pkijs.simpl.ALGORITHM_IDENTIFIER({
                            algorithm_id: hashAlgorithmOID,
                            algorithm_params: new org.pkijs.asn1.NULL()
                        });

                        paramsObject.maskGenAlgorithm = new org.pkijs.simpl.ALGORITHM_IDENTIFIER({
                            algorithm_id: "1.2.840.113549.1.1.8", // MGF1
                            algorithm_params: paramsObject.hashAlgorithm.toSchema()
                        })
                    }

                    if(defParams.algorithm.saltLength !== 20)
                        paramsObject.saltLength = defParams.algorithm.saltLength;

                    var pssParameters = new in_window.org.pkijs.simpl.x509.RSASSA_PSS_params(paramsObject);
                    // #endregion   

                    // #region Automatically set signature algorithm 
                    _this.signatureAlgorithm = new org.pkijs.simpl.ALGORITHM_IDENTIFIER({
                        algorithm_id: "1.2.840.113549.1.1.10",
                        algorithm_params: pssParameters.toSchema()
                    });
                    // #endregion 
                }
                break;
            default:
                return new Promise(function(resolve, reject) { reject("Unsupported signature algorithm: " + privateKey.algorithm.name); });
        }
        // #endregion 

        // #region Create TBS data for signing 
        _this.tbs = in_window.org.pkijs.simpl.PKCS10.prototype.encodeTBS.call(this).toBER(false);
        // #endregion 

        // #region Get a "crypto" extension 
        var crypto = in_window.org.pkijs.getCrypto();
        if(typeof crypto == "undefined")
            return new Promise(function(resolve, reject) { reject("Unable to create WebCrypto object"); });
        // #endregion 

        // #region Signing TBS data on provided private key 
        return crypto.sign(defParams.algorithm,
            privateKey,
            new Uint8Array(_this.tbs)).then(
            function(result)
            {
                // #region Special case for ECDSA algorithm 
                if(defParams.algorithm.name === "ECDSA")
                    result = in_window.org.pkijs.createCMSECDSASignature(result);
                // #endregion 

                _this.signatureValue = new in_window.org.pkijs.asn1.BITSTRING({ value_hex: result });
            },
            function(error)
            {
                return new Promise(function(resolve, reject) { reject("Signing error: " + error); });
            }
            );
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.PKCS10.prototype.toJSON =
    function()
    {
        var _object = {
            tbs: in_window.org.pkijs.bufferToHexCodes(this.tbs, 0, this.tbs.byteLength),
            version: this.version,
            subject: this.subject.toJSON(),
            subjectPublicKeyInfo: this.subjectPublicKeyInfo.toJSON(),
            signatureAlgorithm: this.signatureAlgorithm.toJSON(),
            signatureValue: this.signatureValue.toJSON()
        };

        if("attributes" in this)
        {
            _object.attributes = new Array();

            for(var i = 0; i < this.attributes.length; i++)
                _object.attributes.push(this.attributes[i].toJSON());
        }

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for PKCS#8 private key bag
    //**************************************************************************************
    in_window.org.pkijs.simpl.PKCS8 =
    function()
    {
        // #region Internal properties of the object 
        this.version = 0;
        this.privateKeyAlgorithm = new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER();
        this.privateKey = new in_window.org.pkijs.asn1.OCTETSTRING();
        // OPTIONAL this.attributes // Array of "in_window.org.pkijs.simpl.ATTRIBUTE"
        // #endregion 

        // #region If input argument array contains "schema" for this object 
        if((arguments[0] instanceof Object) && ("schema" in arguments[0]))
            in_window.org.pkijs.simpl.PKCS8.prototype.fromSchema.call(this, arguments[0].schema);
        // #endregion 
        // #region If input argument array contains "native" values for internal properties 
        else
        {
            if(arguments[0] instanceof Object)
            {
                this.version = arguments[0].version || 0;
                this.privateKeyAlgorithm = arguments[0].privateKeyAlgorithm || new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER();
                this.privateKey = arguments[0].privateKey || new in_window.org.pkijs.asn1.OCTETSTRING();

                if("attributes" in arguments[0])
                    this.attributes = arguments[0].attributes;
            }
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.PKCS8.prototype.fromSchema =
    function(schema)
    {
        // #region Check the schema is valid 
        var asn1 = in_window.org.pkijs.compareSchema(schema,
            schema,
            in_window.org.pkijs.schema.PKCS8({
                names: {
                    version: "version",
                    privateKeyAlgorithm: {
                        names: {
                            block_name: "privateKeyAlgorithm"
                        }
                    },
                    privateKey: "privateKey",
                    attributes: "attributes"
                }
            })
            );

        if(asn1.verified === false)
            throw new Error("Object's schema was not verified against input data for PKCS8");
        // #endregion 

        // #region Get internal properties from parsed schema 
        this.version = asn1.result["version"].value_block.value_dec;
        this.privateKeyAlgorithm = new in_window.org.pkijs.simpl.ALGORITHM_IDENTIFIER({ schema: asn1.result["privateKeyAlgorithm"] });
        this.privateKey = asn1.result["privateKey"];

        if("attributes" in asn1.result)
        {
            this.attributes = new Array();
            var attrs = asn1.result["attributes"];

            for(var i = 0; i < attrs.length; i++)
                this.attributes.push(new in_window.org.pkijs.simpl.ATTRIBUTE({ schema: attrs[i] }));
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.PKCS8.prototype.toSchema =
    function()
    {
        // #region Create array for output sequence 
        var output_array = new Array();

        output_array.push(new in_window.org.pkijs.asn1.INTEGER({ value: this.version }));
        output_array.push(this.privateKeyAlgorithm.toSchema());
        output_array.push(this.privateKey);

        if("attributes" in this)
        {
            var attrs = new Array();

            for(var i = 0; i < this.attributes.length; i++)
                attrs.push(this.attributes[i].toSchema());

            output_array.push(new in_window.org.pkijs.asn1.ASN1_CONSTRUCTED({
                optional: true,
                id_block: {
                    tag_class: 3, // CONTEXT-SPECIFIC
                    tag_number: 0 // [0]
                },
                value: attrs
            }));
        }
        // #endregion 

        // #region Construct and return new ASN.1 schema for this object 
        return (new in_window.org.pkijs.asn1.SEQUENCE({
            value: output_array
        }));
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.PKCS8.prototype.toJSON =
    function()
    {
        var _object = {
            version: this.version,
            privateKeyAlgorithm: this.privateKeyAlgorithm.toJSON(),
            privateKey: this.privateKey.toJSON()
        };

        if("attributes" in this)
        {
            _object.attributes = new Array();

            for(var i = 0; i < this.attributes.length; i++)
                _object.attributes.push(this.attributes[i].toJSON());
        }

        return _object;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
    // #region Simplified structure for working with X.509 certificate chains 
    //**************************************************************************************
    in_window.org.pkijs.simpl.CERT_CHAIN =
    function()
    {
        // #region Internal properties of the object 
        /// <field name="trusted_certs" type="Array" elementType="in_window.org.pkijs.simpl.CERT">Array of pre-defined trusted (by user) certificates</field>
        this.trusted_certs = new Array();
        /// <field name="certs" type="Array" elementType="in_window.org.pkijs.simpl.CERT">Array with certificate chain. Could be only one end-user certificate in there!</field>
        this.certs = new Array(); 
        /// <field name="crls" type="Array" elementType="in_window.org.pkijs.simpl.CRL">Array of all CRLs for all certificates from certificate chain</field>
        this.crls = new Array(); 
        // #endregion 

        // #region Initialize internal properties by input values
        if(arguments[0] instanceof Object)
        {
            this.trusted_certs = arguments[0].trusted_certs || new Array();
            this.certs = arguments[0].certs || new Array();
            this.crls = arguments[0].crls || new Array();
        }
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.CERT_CHAIN.prototype.sort =
    function()
    {
        // #region Initial variables 
        /// <var type="Array" elementType="in_window.org.pkijs.simpl.CERT">Array of sorted certificates</var>
        var sorted_certs = new Array();

        /// <var type="Array" elementType="in_window.org.pkijs.simpl.CERT">Initial array of certificates</var>
        var certs = this.certs.slice(0); // Explicity copy "this.certs"

        /// <var type="Date">Date for checking certificate validity period</var>
        var check_date = new Date();

        var _this = this;
        // #endregion 

        // #region Initial checks 
        if(certs.length === 0)
            return new Promise(function(resolve, reject)
            {
                reject({
                    result: false,
                    result_code: 2,
                    result_message: "Certificate's array can not be empty"
                });
            });
        // #endregion 

        // #region Find end-user certificate 
        var end_user_index = -1;

        for(var i = 0; i < certs.length; i++)
        {
            var isCA = false;

            if("extensions" in certs[i])
            {
                var mustBeCA = false;
                var keyUsagePresent = false;
                var cRLSign = false;

                for(var j = 0; j < certs[i].extensions.length; j++)
                {
                    if((certs[i].extensions[j].critical === true) &&
                       (("parsedValue" in certs[i].extensions[j]) === false))
                    {
                        return new Promise(function(resolve, reject)
                        {
                            reject({
                                result: false,
                                result_code: 6,
                                result_message: "Unable to parse critical certificate extension: " + certs[i].extensions[j].extnID
                            });
                        });
                    }

                    if(certs[i].extensions[j].extnID === "2.5.29.15") // KeyUsage
                    {
                        keyUsagePresent = true;

                        var view = new Uint8Array(certs[i].extensions[j].parsedValue.value_block.value_hex);

                        if((view[0] & 0x04) === 0x04) // Set flag "keyCertSign"
                            mustBeCA = true;

                        if((view[0] & 0x02) === 0x02) // Set flag "cRLSign"
                            cRLSign = true;
                    }

                    if(certs[i].extensions[j].extnID === "2.5.29.19") // BasicConstraints
                    {
                        if("cA" in certs[i].extensions[j].parsedValue)
                        {
                            if(certs[i].extensions[j].parsedValue.cA === true)
                                isCA = true;
                        }
                    }
                }

                if((mustBeCA === true) && (isCA === false))
                    return new Promise(function(resolve, reject)
                    {
                        reject({
                            result: false,
                            result_code: 3,
                            result_message: "Unable to build certificate chain - using \"keyCertSign\" flag set without BasicConstaints"
                        });
                    });

                if((keyUsagePresent === true) && (isCA === true) && (mustBeCA === false))
                    return new Promise(function(resolve, reject)
                    {
                        reject({
                            result: false,
                            result_code: 4,
                            result_message: "Unable to build certificate chain - \"keyCertSign\" flag was not set"
                        });
                    });

                if((isCA === true) && (keyUsagePresent === true) && (cRLSign === false))
                    return new Promise(function(resolve, reject)
                    {
                        reject({
                            result: false,
                            result_code: 5,
                            result_message: "Unable to build certificate chain - intermediate certificate must have \"cRLSign\" key usage flag"
                        });
                    });
            }

            if(isCA === false)
            {
                if(sorted_certs.length !== 0)
                    return new Promise(function(resolve, reject)
                    {
                        reject({
                            result: false,
                            result_code: 7,
                            result_message: "Unable to build certificate chain - more than one possible end-user certificate"
                        });
                    });

                sorted_certs.push(certs[i]);
                end_user_index = i;
            }
        }

        certs.splice(end_user_index, 1);
        // #endregion 

        // #region Check that end-user certificate was found 
        if(sorted_certs.length === 0)
            return new Promise(function(resolve, reject)
            {
                reject({
                    result: false,
                    result_code: 1,
                    result_message: "Can't find end-user certificate"
                });
            });
        // #endregion 

        // #region Return if there is only one certificate in certificate's array 
        if(certs.length === 0)
        {
            if(sorted_certs[0].issuer.isEqual(sorted_certs[0].subject) === true)
                return new Promise(function(resolve, reject) { resolve(sorted_certs); });
            else
            {
                if(this.trusted_certs.length === 0)
                {
                    return new Promise(function(resolve, reject)
                    {
                        reject({
                            result: false,
                            result_code: 70,
                            result_message: "Can't find root certificate"
                        });
                    });
                }
                else
                {
                    certs = _this.trusted_certs.splice(0);
                }
            }

        }
        // #endregion 

        /// <var type="in_window.org.pkijs.simpl.CERT">Current certificate (to find issuer for)</var>
        var current_certificate = sorted_certs[0];

        // #region Auxiliary functions working with Promises
        function basic(subject_certificate, issuer_certificate)
        {
            /// <summary>Basic certificate checks</summary>
            /// <param name="subject_certificate" type="in_window.org.pkijs.simpl.CERT">Certificate for testing (subject)</param>
            /// <param name="issuer_certificate" type="in_window.org.pkijs.simpl.CERT">Certificate for issuer of subject certificate</param>

            // #region Initial variables 
            var sequence = Promise.resolve()
            // #endregion 

            // #region Check validity period for subject certificate 
            sequence = sequence.then(
                function()
                {
                    if((subject_certificate.notBefore.value > check_date) ||
                       (subject_certificate.notAfter.value < check_date))
                    {
                        return new Promise(function(resolve, reject)
                        {
                            reject({
                                result: false,
                                result_code: 8,
                                result_message: "Certificate validity period is out of checking date"
                            });
                        });
                    }
                }
                );
            // #endregion 

            // #region Give ability to not provide CRLs (all certificates assume to be valid) 
            if(_this.crls.length === 0)
                return sequence.then(
                    function()
                    {
                        return new Promise(function(resolve, reject) { resolve(); });
                    }
                    );
            // #endregion 

            // #region Find correct CRL for "issuer_certificate" 
            function find_crl(index)
            {
                return _this.crls[index].verify({ issuerCertificate: issuer_certificate }).then(
                    function(result)
                    {
                        if(result === true)
                            return new Promise(function(resolve, reject) { resolve(_this.crls[index]); });
                        else
                        {
                            index++;

                            if(index < _this.crls.length)
                                return find_crl(index);
                            else
                                return new Promise(function(resolve, reject)
                                {
                                    reject({
                                        result: false,
                                        result_code: 9,
                                        result_message: "Unable to find CRL for issuer's certificate"
                                    });
                                });
                        }
                    },
                    function(error)
                    {
                        return new Promise(function(resolve, reject)
                        {
                            reject({
                                result: false,
                                result_code: 10,
                                result_message: "Unable to find CRL for issuer's certificate"
                            });
                        });
                    }
                    );
            }

            sequence = sequence.then(
                function()
                {
                    return find_crl(0);
                }
                );
            // #endregion 

            // #region Check that subject certificate is not in the CRL 
            sequence = sequence.then(
                function(crl)
                {
                    /// <param name="crl" type="in_window.org.pkijs.simpl.CRL">CRL for issuer's certificate</param>                

                    if(crl.isCertificateRevoked({ certificate: subject_certificate }) === true)
                        return new Promise(function(resolve, reject)
                        {
                            reject({
                                result: false,
                                result_code: 11,
                                result_message: "Subject certificate was revoked"
                            });
                        });
                    else
                        return new Promise(function(resolve, reject) { resolve(); });
                },
                function(error)
                {
                    /// <summary>Not for all certificates we have a CRL. So, this "stub" is for handling such situation - assiming we have a valid, non-revoked certificate</summary>
                    return new Promise(function(resolve, reject) { resolve(); });
                }
                );
            // #endregion 

            return sequence;
        }

        function outer()
        {
            return inner(current_certificate, 0).then(
                function(index)
                {
                    sorted_certs.push(certs[index]);
                    current_certificate = certs[index];

                    certs.splice(index, 1);

                    if(current_certificate.issuer.isEqual(current_certificate.subject) === true)
                    {
                        // #region Check that the "self-signed" certificate there is in "trusted_certs" array 
                        var found = (_this.trusted_certs.length === 0) ? true : false; // If user did not set "trusted_certs" then we have an option to trust any self-signed certificate as root

                        for(var i = 0; i < _this.trusted_certs.length; i++)
                        {
                            if((current_certificate.issuer.isEqual(_this.trusted_certs[i].issuer) === true) &&
                               (current_certificate.subject.isEqual(_this.trusted_certs[i].subject) === true) &&
                               (current_certificate.serialNumber.isEqual(_this.trusted_certs[i].serialNumber) === true))
                            {
                                found = true;
                                break;
                            }
                        }

                        if(found === false)
                            return new Promise(function(resolve, reject)
                            {
                                reject({
                                    result: false,
                                    result_code: 22,
                                    result_message: "Self-signed root certificate not in \"trusted certificates\" array"
                                });
                            });
                        // #endregion 

                        return (current_certificate.verify()).then( // Verifing last, self-signed certificate
                            function(result)
                            {
                                if(result === true)
                                    return basic(current_certificate, current_certificate).then(
                                        function()
                                        {
                                            return new Promise(function(resolve, reject) { resolve(sorted_certs); });
                                        },
                                        function(error)
                                        {
                                            return new Promise(function(resolve, reject)
                                            {
                                                reject({
                                                    result: false,
                                                    result_code: 12,
                                                    result_message: error
                                                });
                                            });
                                        }
                                        );
                                else
                                    return new Promise(function(resolve, reject)
                                    {
                                        reject({
                                            result: false,
                                            result_code: 13,
                                            result_message: "Unable to build certificate chain - signature of root certificate is invalid"
                                        });
                                    });
                            },
                            function(error)
                            {
                                return new Promise(function(resolve, reject)
                                {
                                    reject({
                                        result: false,
                                        result_code: 14,
                                        result_message: error
                                    });
                                });
                            }
                            );
                    }
                    else // In case if self-signed cert for the chain in the "trusted_certs" array
                    {
                        if(certs.length > 0)
                            return outer();
                        else
                        {
                            if(_this.trusted_certs.length !== 0)
                            {
                                certs = _this.trusted_certs.splice(0);
                                return outer();
                            }
                            else
                                return new Promise(function(resolve, reject)
                                {
                                    reject({
                                        result: false,
                                        result_code: 23,
                                        result_message: "Root certificate not found"
                                    });
                                });
                        }
                    }
                },
                function(error)
                {
                    return new Promise(function(resolve, reject)
                    {
                        reject(error);
                    });
                }
                );
        }

        function inner(current_certificate, index)
        {
            if(certs[index].subject.isEqual(current_certificate.issuer) === true)
            {
                return current_certificate.verify({ issuerCertificate: certs[index] }).then(
                    function(result)
                    {
                        if(result === true)
                        {
                            return basic(current_certificate, certs[index]).then(
                                function()
                                {
                                    return new Promise(function(resolve, reject) { resolve(index); });
                                },
                                function(error)
                                {
                                    return new Promise(function(resolve, reject)
                                    {
                                        reject({
                                            result: false,
                                            result_code: 16,
                                            result_message: error
                                        });
                                    });
                                }
                                );
                        }
                        else
                        {
                            if(index < (certs.length - 1))
                                return inner(current_certificate, index + 1);
                            else
                                return new Promise(function(resolve, reject)
                                {
                                    reject({
                                        result: false,
                                        result_code: 17,
                                        result_message: "Unable to build certificate chain - incomplete certificate chain or signature of some certificate is invalid"
                                    });
                                });
                        }
                    },
                    function(error)
                    {
                        return new Promise(function(resolve, reject)
                        {
                            reject({
                                result: false,
                                result_code: 18,
                                result_message: "Unable to build certificate chain - error during certificate signature verification"
                            });
                        });
                    }
                    );
            }
            else
            {
                if(index < (certs.length - 1))
                    return inner(current_certificate, index + 1);
                else
                    return new Promise(function(resolve, reject)
                    {
                        reject({
                            result: false,
                            result_code: 19,
                            result_message: "Unable to build certificate chain - incomplete certificate chain"
                        });
                    });
            }
        }
        // #endregion   

        // #region Find certificates for all issuers 
        return outer();
        // #endregion 
    }
    //**************************************************************************************
    in_window.org.pkijs.simpl.CERT_CHAIN.prototype.verify =
    function()
    {
        // #region Initial checks 
        if(this.certs.length === 0)
            return new Promise(function(resolve, reject) { reject("Empty certificate array"); });
        // #endregion 

        // #region Initial variables 
        var sequence = Promise.resolve();

        var _this = this;
        // #endregion 

        // #region Get input variables 
        var initial_policy_set = new Array();
        initial_policy_set.push("2.5.29.32.0"); // "anyPolicy"

        var initial_explicit_policy = false;
        var initial_policy_mapping_inhibit = false;
        var initial_inhibit_policy = false;

        var initial_permitted_subtrees_set = new Array(); // Array of "simpl.x509.GeneralSubtree"
        var initial_excluded_subtrees_set = new Array();  // Array of "simpl.x509.GeneralSubtree"
        var initial_required_name_forms = new Array();    // Array of "simpl.x509.GeneralSubtree"

        var verification_time = new Date();

        if(arguments[0] instanceof Object)
        {
            if("initial_policy_set" in arguments[0])
                initial_policy_set = arguments[0].initial_policy_set;

            if("initial_explicit_policy" in arguments[0])
                initial_explicit_policy = arguments[0].initial_explicit_policy;

            if("initial_policy_mapping_inhibit" in arguments[0])
                initial_policy_mapping_inhibit = arguments[0].initial_policy_mapping_inhibit;

            if("initial_inhibit_policy" in arguments[0])
                initial_inhibit_policy = arguments[0].initial_inhibit_policy;

            if("initial_permitted_subtrees_set" in arguments[0])
                initial_permitted_subtrees_set = arguments[0].initial_permitted_subtrees_set;

            if("initial_excluded_subtrees_set" in arguments[0])
                initial_excluded_subtrees_set = arguments[0].initial_excluded_subtrees_set;

            if("initial_required_name_forms" in arguments[0])
                initial_required_name_forms = arguments[0].initial_required_name_forms;
        }

        var explicit_policy_indicator = initial_explicit_policy;
        var policy_mapping_inhibit_indicator = initial_policy_mapping_inhibit;
        var inhibit_any_policy_indicator = initial_inhibit_policy;

        var pending_constraints = new Array(3);
        pending_constraints[0] = false; // For "explicit_policy_pending"
        pending_constraints[1] = false; // For "policy_mapping_inhibit_pending"
        pending_constraints[2] = false; // For "inhibit_any_policy_pending"

        var explicit_policy_pending = 0;
        var policy_mapping_inhibit_pending = 0;
        var inhibit_any_policy_pending = 0;

        var permitted_subtrees = initial_permitted_subtrees_set;
        var excluded_subtrees = initial_excluded_subtrees_set;
        var required_name_forms = initial_required_name_forms;

        var path_depth = 1;
        // #endregion 

        // #region Sorting certificates in the chain array 
        sequence = (in_window.org.pkijs.simpl.CERT_CHAIN.prototype.sort.call(this)).then(
            function(sorted_certs)
            {
                _this.certs = sorted_certs;
            }
            );
        // #endregion 

        // #region Work with policies
        sequence = sequence.then(
            function()
            {
                // #region Support variables 
                var all_policies = new Array(); // Array of all policies (string values)
                all_policies.push("2.5.29.32.0"); // Put "anyPolicy" at first place

                var policies_and_certs = new Array(); // In fact "array of array" where rows are for each specific policy, column for each certificate and value is "true/false"

                var any_policy_array = new Array(_this.certs.length - 1); // Minus "trusted anchor"
                for(var ii = 0; ii < (_this.certs.length - 1); ii++)
                    any_policy_array[ii] = true;

                policies_and_certs.push(any_policy_array);

                var policy_mappings = new Array(_this.certs.length - 1); // Array of "PolicyMappings" for each certificate
                var cert_policies = new Array(_this.certs.length - 1); // Array of "CertificatePolicies" for each certificate
                // #endregion 

                for(var i = (_this.certs.length - 2) ; i >= 0 ; i--, path_depth++)
                {
                    if("extensions" in _this.certs[i])
                    {
                        for(var j = 0; j < _this.certs[i].extensions.length; j++)
                        {
                            // #region CertificatePolicies 
                            if(_this.certs[i].extensions[j].extnID === "2.5.29.32")
                            {
                                cert_policies[i] = _this.certs[i].extensions[j].parsedValue;

                                for(var k = 0; k < _this.certs[i].extensions[j].parsedValue.certificatePolicies.length; k++)
                                {
                                    var policy_index = (-1);

                                    // #region Try to find extension in "all_policies" array 
                                    for(var s = 0; s < all_policies.length; s++)
                                    {
                                        if(_this.certs[i].extensions[j].parsedValue.certificatePolicies[k].policyIdentifier === all_policies[s])
                                        {
                                            policy_index = s;
                                            break;
                                        }
                                    }
                                    // #endregion 

                                    if(policy_index === (-1))
                                    {
                                        all_policies.push(_this.certs[i].extensions[j].parsedValue.certificatePolicies[k].policyIdentifier);

                                        var cert_array = new Array(_this.certs.length - 1);
                                        cert_array[i] = true;

                                        policies_and_certs.push(cert_array);
                                    }
                                    else
                                        (policies_and_certs[policy_index])[i] = true;
                                }
                            }
                            // #endregion 

                            // #region PolicyMappings 
                            if(_this.certs[i].extensions[j].extnID === "2.5.29.33")
                                policy_mappings[i] = _this.certs[i].extensions[j].parsedValue;
                            // #endregion 

                            // #region PolicyConstraints 
                            if(_this.certs[i].extensions[j].extnID === "2.5.29.36")
                            {
                                if(explicit_policy_indicator == false)
                                {
                                    // #region requireExplicitPolicy 
                                    if(_this.certs[i].extensions[j].parsedValue.requireExplicitPolicy === 0)
                                        explicit_policy_indicator = true;
                                    else
                                    {
                                        if(pending_constraints[0] === false)
                                        {
                                            pending_constraints[0] = true;
                                            explicit_policy_pending = _this.certs[i].extensions[j].parsedValue.requireExplicitPolicy;
                                        }
                                        else
                                        {
                                            explicit_policy_pending = (explicit_policy_pending > _this.certs[i].extensions[j].parsedValue.requireExplicitPolicy) ? _this.certs[i].extensions[j].parsedValue.requireExplicitPolicy : explicit_policy_pending;
                                        }
                                    }
                                    // #endregion 

                                    // #region inhibitPolicyMapping 
                                    if(_this.certs[i].extensions[j].parsedValue.inhibitPolicyMapping === 0)
                                        policy_mapping_inhibit_indicator = true;
                                    else
                                    {
                                        if(pending_constraints[1] === false)
                                        {
                                            pending_constraints[1] = true;
                                            policy_mapping_inhibit_pending = _this.certs[i].extensions[j].parsedValue.requireExplicitPolicy;
                                        }
                                        else
                                        {
                                            policy_mapping_inhibit_pending = (policy_mapping_inhibit_pending > _this.certs[i].extensions[j].parsedValue.requireExplicitPolicy) ? _this.certs[i].extensions[j].parsedValue.requireExplicitPolicy : policy_mapping_inhibit_pending;
                                        }
                                    }
                                    // #endregion   
                                }
                            }
                            // #endregion 

                            // #region InhibitAnyPolicy
                            if(_this.certs[i].extensions[j].extnID === "2.5.29.54")
                            {
                                if(inhibit_any_policy_indicator === false)
                                {
                                    if(_this.certs[i].extensions[j].parsedValue.value_block.value_dec === 0)
                                        inhibit_any_policy_indicator = true;
                                    else
                                    {
                                        if(pending_constraints[2] === false)
                                        {
                                            pending_constraints[2] = true;
                                            inhibit_any_policy_pending = _this.certs[i].extensions[j].parsedValue.value_block.value_dec;
                                        }
                                        else
                                        {
                                            inhibit_any_policy_pending = (inhibit_any_policy_pending > _this.certs[i].extensions[j].parsedValue.value_block.value_dec) ? _this.certs[i].extensions[j].parsedValue.value_block.value_dec : inhibit_any_policy_pending;
                                        }
                                    }
                                }
                            }
                            // #endregion 
                        }

                        // #region Check "inhibit_any_policy_indicator" 
                        if(inhibit_any_policy_indicator === true)
                            delete (policies_and_certs[0])[i]; // Unset value to "undefined" for "anyPolicies" value for current certificate
                        // #endregion 

                        // #region Combine information from certificate policies and policy mappings 
                        if((typeof cert_policies[i] !== "undefined") &&
                           (typeof policy_mappings[i] !== "undefined") &&
                           (policy_mapping_inhibit_indicator === false))
                        {
                            for(var m = 0; m < cert_policies[i].certificatePolicies.length; m++)
                            {
                                var domainPolicy = "";

                                // #region Find if current policy is in "mappings" array 
                                for(var n = 0; n < policy_mappings[i].mappings.length; n++)
                                {
                                    if(policy_mappings[i].mappings[n].subjectDomainPolicy === cert_policies[i].certificatePolicies[m].policyIdentifier)
                                    {
                                        domainPolicy = policy_mappings[i].mappings[n].issuerDomainPolicy;
                                        break;
                                    }

                                    // #region Could be the case for some reasons 
                                    if(policy_mappings[i].mappings[n].issuerDomainPolicy === cert_policies[i].certificatePolicies[m].policyIdentifier)
                                    {
                                        domainPolicy = policy_mappings[i].mappings[n].subjectDomainPolicy;
                                        break;
                                    }
                                    // #endregion 
                                }

                                if(domainPolicy === "")
                                    continue;
                                // #endregion

                                // #region Find the index of "domainPolicy"  
                                var domainPolicy_index = (-1);

                                for(var p = 0; p < all_policies.length; p++)
                                {
                                    if(all_policies[p] === domainPolicy)
                                    {
                                        domainPolicy_index = p;
                                        break;
                                    }
                                }
                                // #endregion 

                                // #region Change array value for "domainPolicy" 
                                if(domainPolicy_index !== (-1))
                                    (policies_and_certs[domainPolicy_index])[i] = true; // Put "set" in "domainPolicy" cell for specific certificate
                                // #endregion 
                            }
                        }
                        // #endregion 

                        // #region Process with "pending constraints" 
                        if(explicit_policy_indicator === false)
                        {
                            if(pending_constraints[0] === true)
                            {
                                explicit_policy_pending--;
                                if(explicit_policy_pending === 0)
                                {
                                    explicit_policy_indicator = true;
                                    pending_constraints[0] = false;
                                }
                            }
                        }

                        if(policy_mapping_inhibit_indicator === false)
                        {
                            if(pending_constraints[1] === true)
                            {
                                policy_mapping_inhibit_pending--;
                                if(policy_mapping_inhibit_pending === 0)
                                {
                                    policy_mapping_inhibit_indicator = true;
                                    pending_constraints[1] = false;
                                }
                            }
                        }

                        if(inhibit_any_policy_indicator === false)
                        {
                            if(pending_constraints[2] === true)
                            {
                                inhibit_any_policy_pending--;
                                if(inhibit_any_policy_pending === 0)
                                {
                                    inhibit_any_policy_indicator = true;
                                    pending_constraints[2] = false;
                                }
                            }
                        }
                        // #endregion 
                    }
                }

                // #region Create "set of authorities-constrained policies"
                var auth_constr_policies = new Array();

                for(var i = 0; i < policies_and_certs.length; i++)
                {
                    var found = true;

                    for(var j = 0; j < (_this.certs.length - 1) ; j++)
                    {
                        if(typeof (policies_and_certs[i])[j] === "undefined")
                        {
                            found = false;
                            break;
                        }
                    }

                    if(found === true)
                        auth_constr_policies.push(all_policies[i]);
                }
                // #endregion 

                // #region Create "set of user-constrained policies"
                var user_constr_policies = new Array();

                for(var i = 0; i < auth_constr_policies.length; i++)
                {
                    for(var j = 0; j < initial_policy_set.length; j++)
                    {
                        if(initial_policy_set[j] === auth_constr_policies[i])
                        {
                            user_constr_policies.push(initial_policy_set[j]);
                            break;
                        }
                    }
                }
                // #endregion 

                // #region Combine output object 
                return {
                    result: (user_constr_policies.length > 0) ? true : false,
                    result_code: 0,
                    result_message: (user_constr_policies.length > 0) ? "" : "Zero \"user_constr_policies\" array, no intersections with \"auth_constr_policies\"",
                    auth_constr_policies: auth_constr_policies,
                    user_constr_policies: user_constr_policies,
                    explicit_policy_indicator: explicit_policy_indicator,
                    policy_mappings: policy_mappings
                };
                // #endregion 
            }
            );
        // #endregion 

        // #region Work with name constraints
        sequence = sequence.then(
            function(policy_result)
            {
                // #region Auxiliary functions for name constraints checking
                function compare_dNSName(name, constraint)
                {
                    /// <summary>Compare two dNSName values</summary>
                    /// <param name="name" type="String">DNS from name</param>
                    /// <param name="constraint" type="String">Constraint for DNS from name</param>
                    /// <returns type="Boolean">Boolean result - valid or invalid the "name" against the "constraint"</returns>

                    // #region Make a "string preparation" for both name and constrain 
                    var name_prepared = in_window.org.pkijs.stringPrep(name);
                    var constraint_prepared = in_window.org.pkijs.stringPrep(constraint);
                    // #endregion 

                    // #region Make a "splitted" versions of "constraint" and "name" 
                    var name_splitted = name_prepared.split(".");
                    var constraint_splitted = constraint_prepared.split(".");
                    // #endregion 

                    // #region Length calculation and additional check 
                    var name_len = name_splitted.length;
                    var constr_len = constraint_splitted.length;

                    if((name_len === 0) || (constr_len === 0) || (name_len < constr_len))
                        return false;
                    // #endregion 

                    // #region Check that no part of "name" has zero length 
                    for(var i = 0; i < name_len; i++)
                    {
                        if(name_splitted[i].length === 0)
                            return false;
                    }
                    // #endregion 

                    // #region Check that no part of "constraint" has zero length
                    for(var i = 0; i < constr_len; i++)
                    {
                        if(constraint_splitted[i].length === 0)
                        {
                            if(i === 0)
                            {
                                if(constr_len === 1)
                                    return false;
                                else
                                    continue;
                            }

                            return false;
                        }
                    }
                    // #endregion 

                    // #region Check that "name" has a tail as "constraint" 

                    for(var i = 0; i < constr_len; i++)
                    {
                        if(constraint_splitted[constr_len - 1 - i].length === 0)
                            continue;

                        if(name_splitted[name_len - 1 - i].localeCompare(constraint_splitted[constr_len - 1 - i]) !== 0)
                            return false;
                    }
                    // #endregion 

                    return true;
                }

                function compare_rfc822Name(name, constraint)
                {
                    /// <summary>Compare two rfc822Name values</summary>
                    /// <param name="name" type="String">E-mail address from name</param>
                    /// <param name="constraint" type="String">Constraint for e-mail address from name</param>
                    /// <returns type="Boolean">Boolean result - valid or invalid the "name" against the "constraint"</returns>

                    // #region Make a "string preparation" for both name and constrain 
                    var name_prepared = in_window.org.pkijs.stringPrep(name);
                    var constraint_prepared = in_window.org.pkijs.stringPrep(constraint);
                    // #endregion 

                    // #region Make a "splitted" versions of "constraint" and "name" 
                    var name_splitted = name_prepared.split("@");
                    var constraint_splitted = constraint_prepared.split("@");
                    // #endregion 

                    // #region Splitted array length checking 
                    if((name_splitted.length === 0) || (constraint_splitted.length === 0) || (name_splitted.length < constraint_splitted.length))
                        return false;
                    // #endregion 

                    if(constraint_splitted.length === 1)
                    {
                        var result = compare_dNSName(name_splitted[1], constraint_splitted[0]);

                        if(result)
                        {
                            // #region Make a "splitted" versions of domain name from "constraint" and "name" 
                            var ns = name_splitted[1].split(".");
                            var cs = constraint_splitted[0].split(".");
                            // #endregion 

                            if(cs[0].length === 0)
                                return true;

                            if(ns.length !== cs.length)
                                return false;
                            else
                                return true;
                        }
                        else
                            return false;
                    }
                    else
                        return (name_prepared.localeCompare(constraint_prepared) === 0) ? true : false;

                    return false;
                }

                function compare_uniformResourceIdentifier(name, constraint)
                {
                    /// <summary>Compare two uniformResourceIdentifier values</summary>
                    /// <param name="name" type="String">uniformResourceIdentifier from name</param>
                    /// <param name="constraint" type="String">Constraint for uniformResourceIdentifier from name</param>
                    /// <returns type="Boolean">Boolean result - valid or invalid the "name" against the "constraint"</returns>

                    // #region Make a "string preparation" for both name and constrain 
                    var name_prepared = in_window.org.pkijs.stringPrep(name);
                    var constraint_prepared = in_window.org.pkijs.stringPrep(constraint);
                    // #endregion 

                    // #region Find out a major URI part to compare with
                    var ns = name_prepared.split("/");
                    var cs = constraint_prepared.split("/");

                    if(cs.length > 1) // Malformed constraint
                        return false;

                    if(ns.length > 1) // Full URI string
                    {
                        for(var i = 0; i < ns.length; i++)
                        {
                            if((ns[i].length > 0) && (ns[i].charAt(ns[i].length - 1) !== ':'))
                            {
                                var ns_port = ns[i].split(":");
                                name_prepared = ns_port[0];
                                break;
                            }
                        }
                    }
                    // #endregion 

                    var result = compare_dNSName(name_prepared, constraint_prepared);

                    if(result)
                    {
                        // #region Make a "splitted" versions of "constraint" and "name" 
                        var name_splitted = name_prepared.split(".");
                        var constraint_splitted = constraint_prepared.split(".");
                        // #endregion 

                        if(constraint_splitted[0].length === 0)
                            return true;

                        if(name_splitted.length !== constraint_splitted.length)
                            return false;
                        else
                            return true;
                    }
                    else
                        return false;

                    return false;
                }

                function compare_iPAddress(name, constraint)
                {
                    /// <summary>Compare two iPAddress values</summary>
                    /// <param name="name" type="in_window.org.pkijs.asn1.OCTETSTRING">iPAddress from name</param>
                    /// <param name="constraint" type="in_window.org.pkijs.asn1.OCTETSTRING">Constraint for iPAddress from name</param>
                    /// <returns type="Boolean">Boolean result - valid or invalid the "name" against the "constraint"</returns>

                    // #region Common variables 
                    var name_view = new Uint8Array(name.value_block.value_hex);
                    var constraint_view = new Uint8Array(constraint.value_block.value_hex);
                    // #endregion 

                    // #region Work with IPv4 addresses 
                    if((name_view.length === 4) && (constraint_view.length === 8))
                    {
                        for(var i = 0; i < 4; i++)
                        {
                            if((name_view[i] ^ constraint_view[i]) & constraint_view[i + 4])
                                return false;
                        }

                        return true;
                    }
                    // #endregion 

                    // #region Work with IPv6 addresses 
                    if((name_view.length === 16) && (constraint_view.length === 32))
                    {
                        for(var i = 0; i < 16; i++)
                        {
                            if((name_view[i] ^ constraint_view[i]) & constraint_view[i + 16])
                                return false;
                        }

                        return true;
                    }
                    // #endregion 

                    return false;
                }

                function compare_directoryName(name, constraint)
                {
                    /// <summary>Compare two directoryName values</summary>
                    /// <param name="name" type="in_window.org.pkijs.simpl.RDN">directoryName from name</param>
                    /// <param name="constraint" type="in_window.org.pkijs.simpl.RDN">Constraint for directoryName from name</param>
                    /// <param name="any" type="Boolean">Boolean flag - should be comparision interrupted after first match or we need to match all "constraints" parts</param>
                    /// <returns type="Boolean">Boolean result - valid or invalid the "name" against the "constraint"</returns>

                    // #region Initial check 
                    if((name.types_and_values.length === 0) || (constraint.types_and_values.length === 0))
                        return true;

                    if(name.types_and_values.length < constraint.types_and_values.length)
                        return false;
                    // #endregion 

                    // #region Initial variables 
                    var result = true;
                    var name_start = 0;
                    // #endregion 

                    for(var i = 0; i < constraint.types_and_values.length; i++)
                    {
                        var local_result = false;

                        for(var j = name_start; j < name.types_and_values.length; j++)
                        {
                            local_result = name.types_and_values[j].isEqual(constraint.types_and_values[i]);

                            if(name.types_and_values[j].type === constraint.types_and_values[i].type)
                                result = result && local_result;

                            if(local_result === true)
                            {
                                if((name_start === 0) || (name_start === j))
                                {
                                    name_start = j + 1;
                                    break;
                                }
                                else // Structure of "name" must be the same with "constraint"
                                    return false;
                            }
                        }

                        if(local_result === false)
                            return false;
                    }

                    return (name_start === 0) ? false : result;
                }
                // #endregion 

                // #region Check a result from "policy checking" part  
                if(policy_result.result === false)
                    return policy_result;
                // #endregion 

                // #region Check all certificates, excluding "trust anchor" 
                path_depth = 1;

                for(var i = (_this.certs.length - 2) ; i >= 0 ; i--, path_depth++)
                {
                    // #region Support variables 
                    var subject_alt_names = new Array();

                    var cert_permitted_subtrees = new Array();
                    var cert_excluded_subtrees = new Array();
                    // #endregion 

                    if("extensions" in _this.certs[i])
                    {
                        for(var j = 0; j < _this.certs[i].extensions.length; j++)
                        {
                            // #region NameConstraints 
                            if(_this.certs[i].extensions[j].extnID === "2.5.29.30")
                            {
                                if("permittedSubtrees" in _this.certs[i].extensions[j].parsedValue)
                                    cert_permitted_subtrees = cert_permitted_subtrees.concat(_this.certs[i].extensions[j].parsedValue.permittedSubtrees);

                                if("excludedSubtrees" in _this.certs[i].extensions[j].parsedValue)
                                    cert_excluded_subtrees = cert_excluded_subtrees.concat(_this.certs[i].extensions[j].parsedValue.excludedSubtrees);
                            }
                            // #endregion   

                            // #region SubjectAltName 
                            if(_this.certs[i].extensions[j].extnID === "2.5.29.17")
                                subject_alt_names = subject_alt_names.concat(_this.certs[i].extensions[j].parsedValue.altNames);
                            // #endregion 

                            // #region PKCS#9 e-mail address 
                            if(_this.certs[i].extensions[j].extnID === "1.2.840.113549.1.9.1")
                                email_addresses.push(_this.certs[i].extensions[j].parsedValue.value);
                            // #endregion 
                        }
                    }

                    // #region Checking for "required name forms" 
                    var form_found = (required_name_forms.length > 0) ? false : true;

                    for(var j = 0; j < required_name_forms.length; j++)
                    {
                        switch(required_name_forms[j].base.NameType)
                        {
                            case 4: // directoryName
                                {
                                    if(required_name_forms[j].base.Name.types_and_values.length !== _this.certs[i].subject.types_and_values.length)
                                        continue;

                                    form_found = true;

                                    for(var k = 0; k < _this.certs[i].subject.types_and_values.length; k++)
                                    {
                                        if(_this.certs[i].subject.types_and_values[k].type !== required_name_forms[j].base.Name.types_and_values[k].type)
                                        {
                                            form_found = false;
                                            break;
                                        }
                                    }

                                    if(form_found === true)
                                        break;
                                }
                                break;
                            default:; // ??? Probably here we should reject the certificate ???
                        }
                    }

                    if(form_found === false)
                    {
                        policy_result.result = false;
                        policy_result.result_code = 21;
                        policy_result.result_message = "No neccessary name form found";

                        return new Promise(function(resolve, reject)
                        {
                            reject(policy_result);
                        });
                    }
                    // #endregion 

                    // #region Checking for "permited sub-trees" 
                    // #region Make groups for all types of constraints 
                    var constr_groups = new Array(); // Array of array for groupped constraints
                    constr_groups[0] = new Array(); // rfc822Name
                    constr_groups[1] = new Array(); // dNSName
                    constr_groups[2] = new Array(); // directoryName
                    constr_groups[3] = new Array(); // uniformResourceIdentifier
                    constr_groups[4] = new Array(); // iPAddress

                    for(var j = 0; j < permitted_subtrees.length; j++)
                    {
                        switch(permitted_subtrees[j].base.NameType)
                        {
                            // #region rfc822Name 
                            case 1:
                                constr_groups[0].push(permitted_subtrees[j]);
                                break;
                            // #endregion 
                            // #region dNSName 
                            case 2:
                                constr_groups[1].push(permitted_subtrees[j]);
                                break;
                            // #endregion 
                            // #region directoryName 
                            case 4:
                                constr_groups[2].push(permitted_subtrees[j]);
                                break;
                            // #endregion 
                            // #region uniformResourceIdentifier 
                            case 6:
                                constr_groups[3].push(permitted_subtrees[j]);
                                break;
                            // #endregion 
                            // #region iPAddress 
                            case 7:
                                constr_groups[4].push(permitted_subtrees[j]);
                                break;
                            // #endregion 
                            // #region default 
                            default:;
                            // #endregion 
                        }
                    }
                    // #endregion   

                    // #region Check name constraints groupped by type, one-by-one 
                    for(var p = 0; p < 5; p++)
                    {
                        var group_permitted = false;
                        var group = constr_groups[p];

                        for(var j = 0; j < group.length; j++)
                        {
                            switch(p)
                            {
                                // #region rfc822Name 
                                case 0:
                                    if(subject_alt_names.length >= 0)
                                    {
                                        for(var k = 0; k < subject_alt_names.length; k++)
                                        {
                                            if(subject_alt_names[k].NameType === 1) // rfc822Name
                                                group_permitted = group_permitted || compare_rfc822Name(subject_alt_names[k].Name, group[j].base.Name);
                                        }
                                    }
                                    else // Try to find out "emailAddress" inside "subject"
                                    {
                                        for(var k = 0; k < _this.certs[i].subject.types_and_values.length; k++)
                                        {
                                            if((_this.certs[i].subject.types_and_values[k].type === "1.2.840.113549.1.9.1") ||    // PKCS#9 e-mail address
                                               (_this.certs[i].subject.types_and_values[k].type === "0.9.2342.19200300.100.1.3")) // RFC1274 "rfc822Mailbox" e-mail address
                                            {
                                                group_permitted = group_permitted || compare_rfc822Name(_this.certs[i].subject.types_and_values[k].value.value_block.value, group[j].base.Name);
                                            }
                                        }
                                    }
                                    break;
                                // #endregion 
                                // #region dNSName 
                                case 1:
                                    if(subject_alt_names.length > 0)
                                    {
                                        for(var k = 0; k < subject_alt_names.length; k++)
                                        {
                                            if(subject_alt_names[k].NameType === 2) // dNSName
                                                group_permitted = group_permitted || compare_dNSName(subject_alt_names[k].Name, group[j].base.Name);
                                        }
                                    }
                                    break;
                                // #endregion 
                                // #region directoryName 
                                case 2:
                                    group_permitted = compare_directoryName(_this.certs[i].subject, group[j].base.Name);
                                    break;
                                // #endregion 
                                // #region uniformResourceIdentifier 
                                case 3:
                                    if(subject_alt_names.length > 0)
                                    {
                                        for(var k = 0; k < subject_alt_names.length; k++)
                                        {
                                            if(subject_alt_names[k].NameType === 6) // uniformResourceIdentifier
                                                group_permitted = group_permitted || compare_uniformResourceIdentifier(subject_alt_names[k].Name, group[j].base.Name);
                                        }
                                    }
                                    break;
                                // #endregion 
                                // #region iPAddress 
                                case 4:
                                    if(subject_alt_names.length > 0)
                                    {
                                        for(var k = 0; k < subject_alt_names.length; k++)
                                        {
                                            if(subject_alt_names[k].NameType === 7) // iPAddress
                                                group_permitted = group_permitted || compare_iPAddress(subject_alt_names[k].Name, group[j].base.Name);
                                        }
                                    }
                                    break;
                                // #endregion 
                                // #region default 
                                default:;
                                // #endregion 
                            }

                            if(group_permitted)
                                break;
                        }

                        if((group_permitted === false) && (group.length > 0))
                        {
                            policy_result.result = false;
                            policy_result.result_code = 41;
                            policy_result.result_message = "Failed to meet \"permitted sub-trees\" name constraint";

                            return new Promise(function(resolve, reject)
                            {
                                reject(policy_result);
                            });
                        }
                    }
                    // #endregion 
                    // #endregion 

                    // #region Checking for "excluded sub-trees" 
                    var excluded = false;

                    for(var j = 0; j < excluded_subtrees.length; j++)
                    {
                        switch(excluded_subtrees[j].base.NameType)
                        {
                            // #region rfc822Name 
                            case 1:
                                if(subject_alt_names.length >= 0)
                                {
                                    for(var k = 0; k < subject_alt_names.length; k++)
                                    {
                                        if(subject_alt_names[k].NameType === 1) // rfc822Name
                                            excluded = excluded || compare_rfc822Name(subject_alt_names[k].Name, excluded_subtrees[j].base.Name);
                                    }
                                }
                                else // Try to find out "emailAddress" inside "subject"
                                {
                                    for(var k = 0; k < _this.subject.types_and_values.length; k++)
                                    {
                                        if((_this.subject.types_and_values[k].type === "1.2.840.113549.1.9.1") ||    // PKCS#9 e-mail address
                                           (_this.subject.types_and_values[k].type === "0.9.2342.19200300.100.1.3")) // RFC1274 "rfc822Mailbox" e-mail address
                                        {
                                            excluded = excluded || compare_rfc822Name(_this.subject.types_and_values[k].value.value_block.value, excluded_subtrees[j].base.Name);
                                        }
                                    }
                                }
                                break;
                            // #endregion 
                            // #region dNSName 
                            case 2:
                                if(subject_alt_names.length > 0)
                                {
                                    for(var k = 0; k < subject_alt_names.length; k++)
                                    {
                                        if(subject_alt_names[k].NameType === 2) // dNSName
                                            excluded = excluded || compare_dNSName(subject_alt_names[k].Name, excluded_subtrees[j].base.Name);
                                    }
                                }
                                break;
                            // #endregion 
                            // #region directoryName 
                            case 4:
                                excluded = excluded || compare_directoryName(_this.certs[i].subject, excluded_subtrees[j].base.Name);
                                break;
                            // #endregion 
                            // #region uniformResourceIdentifier 
                            case 6:
                                if(subject_alt_names.length > 0)
                                {
                                    for(var k = 0; k < subject_alt_names.length; k++)
                                    {
                                        if(subject_alt_names[k].NameType === 6) // uniformResourceIdentifier
                                            excluded = excluded || compare_uniformResourceIdentifier(subject_alt_names[k].Name, excluded_subtrees[j].base.Name);
                                    }
                                }
                                break;
                            // #endregion 
                            // #region iPAddress 
                            case 7:
                                if(subject_alt_names.length > 0)
                                {
                                    for(var k = 0; k < subject_alt_names.length; k++)
                                    {
                                        if(subject_alt_names[k].NameType === 7) // iPAddress
                                            excluded = excluded || compare_iPAddress(subject_alt_names[k].Name, excluded_subtrees[j].base.Name);
                                    }
                                }
                                break;
                            // #endregion 
                            // #region default 
                            default:; // No action, but probably here we need to create a warning for "malformed constraint"
                            // #endregion 
                        }

                        if(excluded)
                            break;
                    }

                    if(excluded === true)
                    {
                        policy_result.result = false;
                        policy_result.result_code = 42;
                        policy_result.result_message = "Failed to meet \"excluded sub-trees\" name constraint";

                        return new Promise(function(resolve, reject)
                        {
                            reject(policy_result);
                        });
                    }
                    // #endregion 

                    // #region Append "cert_..._subtrees" to "..._subtrees" 
                    permitted_subtrees = permitted_subtrees.concat(cert_permitted_subtrees);
                    excluded_subtrees = excluded_subtrees.concat(cert_excluded_subtrees);
                    // #endregion   
                }
                // #endregion 

                return policy_result;
            }
            );
        // #endregion   

        return sequence;
    }
    //**************************************************************************************
    // #endregion 
    //**************************************************************************************
}
)(typeof exports !== "undefined" ? exports : window);

